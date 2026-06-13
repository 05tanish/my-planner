import TelegramBot from 'node-telegram-bot-api';
import { env } from '../config/env';
import prisma from '../config/database';
import { del } from './redis.service';
import { startOfDay, endOfDay, subDays, format, differenceInDays } from 'date-fns';
import { uploadFile } from './storage.service';

// ─── In-memory session store (for multi-step flows) ──────────────────────────
const tempStorage = new Map<string, {
  text?: string;
  fileUrl?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  step?: string;     // multi-step conversation state
  data?: Record<string, any>;
}>();

let bot: TelegramBot | null = null;

if (env.TELEGRAM_BOT_TOKEN) {
  try {
    bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('🤖 Telegram Bot Service initialized (Interactive Polling mode)');
    setupBotListeners();
  } catch (error) {
    console.error('❌ Failed to initialize Telegram Bot:', error);
  }
} else {
  console.log('🤖 [Telegram Bot Not Configured] Running in mock mode');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const sendTelegramMessage = async (chatId: string, text: string) => {
  if (bot) {
    try {
      await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (error) {
      console.error(`❌ Failed to send Telegram message to chat ${chatId}:`, error);
    }
  } else {
    console.log(`🤖 [Mock] Chat:${chatId} → ${text.slice(0, 80)}`);
  }
};

export const sendGithubPushReminder = async (chatId: string) => {
  await sendTelegramMessage(chatId,
    `⚠️ <b>GitHub Streak Alert</b>\n\n` +
    `You haven't pushed any commits today!\n` +
    `Your green squares need you. 🟩 Push before midnight! 🚀`
  );
};

export const sendDsaRevisionReminder = async (chatId: string, problemName: string) => {
  await sendTelegramMessage(chatId,
    `📚 <b>DSA Revision Due</b>\n\n` +
    `Problem: <b>${problemName}</b>\n\n` +
    `Spaced repetition works — do this revision now! 💪\n` +
    `Use /dsa to see all pending revisions.`
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function divider() { return '─'.repeat(28); }

function buildMainMenu(name: string) {
  return {
    text:
      `🤖 <b>DevOS Assistant</b> — Hey <b>${name}</b>! 👋\n\n` +
      `<i>Your personal productivity bot. What do you want to do?</i>\n\n` +
      `${divider()}\n` +
      `📝 Tasks   📚 DSA   🐙 GitHub\n` +
      `📓 Notes   💼 Jobs   📊 Stats`,
    keyboard: {
      inline_keyboard: [
        [
          { text: '📝 My Tasks', callback_data: 'menu:tasks' },
          { text: '📚 DSA Status', callback_data: 'menu:dsa' },
        ],
        [
          { text: '🐙 GitHub Today', callback_data: 'menu:github' },
          { text: '📊 Dashboard', callback_data: 'menu:dashboard' },
        ],
        [
          { text: '➕ Add Task', callback_data: 'menu:add_task' },
          { text: '📓 Add Note', callback_data: 'menu:add_note' },
        ],
        [
          { text: '💼 Log Job App', callback_data: 'menu:add_job' },
          { text: '✅ DSA Done Today', callback_data: 'action:dsa_toggle' },
        ],
        [
          { text: '❓ Help & Commands', callback_data: 'menu:help' },
        ],
      ],
    },
  };
}

// ─── Bot Setup ────────────────────────────────────────────────────────────────

function setupBotListeners() {
  if (!bot) return;

  const findUserByChatId = async (chatId: number) =>
    prisma.profile.findFirst({
      where: { telegramChatId: chatId.toString() },
      include: { user: true },
    });

  // ── Safe sender ──────────────────────────────────────────────────────────
  const send = async (chatId: number, text: string, extra?: TelegramBot.SendMessageOptions) => {
    try {
      await bot!.sendMessage(chatId, text, { parse_mode: 'HTML', ...extra });
    } catch (err) {
      console.error('❌ Send error:', err);
    }
  };

  const edit = async (chatId: number, msgId: number, text: string, extra?: TelegramBot.EditMessageTextOptions) => {
    try {
      await bot!.editMessageText(text, {
        chat_id: chatId, message_id: msgId, parse_mode: 'HTML', ...extra
      });
    } catch (err) { /* ignore */ }
  };

  const answerCb = async (queryId: string, text?: string) => {
    try { await bot!.answerCallbackQuery(queryId, { text }); } catch (_) { }
  };

  // ── Callback Query Handler ────────────────────────────────────────────────
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const msgId  = query.message?.message_id;
    const data   = query.data;
    if (!chatId || !data) return;

    try {
      const profile = await findUserByChatId(chatId);

      // Handle /link action before profile check
      if (data.startsWith('action:none')) {
        await answerCb(query.id);
        return;
      }

      if (!profile) {
        await answerCb(query.id, '❌ Account not linked');
        await send(chatId, '❌ <b>Not linked.</b> Use /link &lt;PIN&gt; from Settings → Telegram Integration.');
        return;
      }

      const userId  = profile.userId;
      const today   = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      // ── MENU navigations ─────────────────────────────────────────────────
      if (data === 'menu:main') {
        const menu = buildMainMenu(profile.name);
        if (msgId) await edit(chatId, msgId, menu.text, { reply_markup: menu.keyboard });
        else       await send(chatId, menu.text, { reply_markup: menu.keyboard });
        await answerCb(query.id);
        return;
      }

      if (data === 'menu:help') {
        const helpText =
          `❓ <b>DevOS Bot — Command Reference</b>\n\n${divider()}\n\n` +
          `<b>📝 Tasks</b>\n` +
          `• /tasks — pending tasks list\n` +
          `• /task &lt;title&gt; — create task\n` +
          `• /done &lt;n&gt; — mark task complete\n\n` +
          `<b>📚 DSA</b>\n` +
          `• /dsa — revisions due today\n` +
          `• /dsastatus — today's goal status\n` +
          `• /dsadone — toggle goal complete\n\n` +
          `<b>🐙 GitHub</b>\n` +
          `• /ghstatus — today's commits\n` +
          `• /ghcommits &lt;n&gt; — last n days log\n\n` +
          `<b>📓 Notes & Jobs</b>\n` +
          `• Send any text → save as task / note / job\n` +
          `• Upload a PDF → save as book or resource\n\n` +
          `<b>🔗 Linking</b>\n` +
          `• /link &lt;6-digit-pin&gt; — link your account\n` +
          `• /me — your profile info`;
        await send(chatId, helpText, {
          reply_markup: {
            inline_keyboard: [[{ text: '← Back to Menu', callback_data: 'menu:main' }]]
          }
        });
        await answerCb(query.id);
        return;
      }

      if (data === 'menu:tasks') {
        const tasks = await prisma.task.findMany({
          where: {
            userId,
            status: { in: ['TODO', 'IN_PROGRESS'] },
            OR: [{ dueDate: null }, { dueDate: { lte: todayEnd } }],
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
          take: 15,
        });

        const priorityIcon: Record<string, string> = { URGENT: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
        let text = `📝 <b>Pending Tasks</b>  (${tasks.length})\n${divider()}\n\n`;
        if (!tasks.length) {
          text += `🎉 No pending tasks! You're all caught up.`;
        } else {
          tasks.forEach((t: any, i: number) => {
            text += `${i + 1}. ${priorityIcon[t.priority] || '⚪'} <b>${t.title}</b>\n`;
            if (t.category) text += `   <i>${t.category}</i>\n`;
          });
          text += `\n<i>Reply /done &lt;n&gt; to complete a task</i>`;
        }
        await send(chatId, text, {
          reply_markup: { inline_keyboard: [[{ text: '← Menu', callback_data: 'menu:main' }]] }
        });
        await answerCb(query.id);
        return;
      }

      if (data === 'menu:dsa') {
        const [goal, revisions] = await Promise.all([
          prisma.dsaDailyGoal.findUnique({ where: { userId_date: { userId, date: today } } }),
          prisma.dsaRevision.findMany({
            where: { problem: { userId }, dueDate: { lte: todayEnd }, completedAt: null },
            include: { problem: { select: { name: true, platform: true, difficulty: true } } },
            take: 10,
          }),
        ]);

        const completed = goal?.completed;
        const diff: Record<string, string> = { EASY: '🟢', MEDIUM: '🟡', HARD: '🔴' };
        let text = `📚 <b>DSA Overview</b>\n${divider()}\n\n`;
        text += `🎯 <b>Daily Goal:</b> ${completed ? '✅ Completed!' : '⏳ Pending'}\n`;
        text += `📌 <b>Revisions Due:</b> ${revisions.length}\n\n`;
        if (revisions.length) {
          text += `<b>Due Today:</b>\n`;
          revisions.slice(0, 8).forEach((r: any, i: number) => {
            text += `${i + 1}. ${diff[r.problem.difficulty] || '⚪'} <b>${r.problem.name}</b> <i>(${r.problem.platform})</i>\n`;
          });
          if (revisions.length > 8) text += `... and ${revisions.length - 8} more\n`;
        }
        await send(chatId, text, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: completed ? '↩️ Reset Goal' : '✅ Mark Done', callback_data: 'action:dsa_toggle' },
              ],
              [{ text: '← Menu', callback_data: 'menu:main' }],
            ]
          }
        });
        await answerCb(query.id);
        return;
      }

      if (data === 'menu:github') {
        const activity = await prisma.githubActivity.findFirst({
          where: { userId, date: today },
        });
        const commits  = activity?.commits  || 0;
        const repos    = (activity?.repositories as string[] | null)?.join(', ') || '—';
        const features = activity?.features || '—';
        const status   = commits > 0 ? '✅ Streak active!' : '⚠️ No commits yet';
        const text =
          `🐙 <b>GitHub — Today</b>\n${divider()}\n\n` +
          `${status}\n\n` +
          `📦 <b>Commits:</b> ${commits}\n` +
          `🗂 <b>Repos:</b> ${repos}\n` +
          `🔧 <b>Features:</b> ${features}\n\n` +
          `<i>Use /ghcommits 7 for last 7 days</i>`;
        await send(chatId, text, {
          reply_markup: { inline_keyboard: [[{ text: '← Menu', callback_data: 'menu:main' }]] }
        });
        await answerCb(query.id);
        return;
      }

      if (data === 'menu:dashboard') {
        const [tasksDue, tasksDone, dsaSolved, githubToday, activeJobs] = await Promise.all([
          prisma.task.count({ where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
          prisma.task.count({ where: { userId, status: 'DONE', updatedAt: { gte: today } } }),
          prisma.dsaProblem.count({ where: { userId } }),
          prisma.githubActivity.findFirst({ where: { userId, date: today } }),
          prisma.job.count({ where: { userId, status: { in: ['APPLIED', 'OA', 'INTERVIEW'] } } }),
        ]);
        const text =
          `📊 <b>Dashboard Summary</b>\n${divider()}\n\n` +
          `📝 Tasks pending: <b>${tasksDue}</b>  (✅ ${tasksDone} done today)\n` +
          `🧠 DSA problems solved: <b>${dsaSolved}</b>\n` +
          `🐙 GitHub commits today: <b>${githubToday?.commits || 0}</b>\n` +
          `💼 Active job applications: <b>${activeJobs}</b>\n\n` +
          `<i>${format(new Date(), 'EEEE, dd MMM yyyy')}</i>`;
        await send(chatId, text, {
          reply_markup: { inline_keyboard: [[{ text: '← Menu', callback_data: 'menu:main' }]] }
        });
        await answerCb(query.id);
        return;
      }

      if (data === 'menu:add_task') {
        tempStorage.set(chatId.toString(), { step: 'await_task_title' });
        await send(chatId,
          `📝 <b>Add New Task</b>\n\n` +
          `Send me the task title now:\n<i>(or /cancel to abort)</i>`
        );
        await answerCb(query.id);
        return;
      }

      if (data === 'menu:add_note') {
        tempStorage.set(chatId.toString(), { step: 'await_note' });
        await send(chatId,
          `📓 <b>Add Note</b>\n\n` +
          `Send me your note text now. The first line will be used as the title.\n<i>(or /cancel to abort)</i>`
        );
        await answerCb(query.id);
        return;
      }

      if (data === 'menu:add_job') {
        tempStorage.set(chatId.toString(), { step: 'await_job' });
        await send(chatId,
          `💼 <b>Log Job Application</b>\n\n` +
          `Send details in this format:\n` +
          `<code>Company | Role | Salary (optional) | Notes (optional)</code>\n\n` +
          `Example:\n<code>Google | SWE Intern | ₹80k/mo | referral from John</code>\n\n` +
          `<i>(or /cancel to abort)</i>`
        );
        await answerCb(query.id);
        return;
      }

      // ── ACTIONS ──────────────────────────────────────────────────────────
      if (data === 'action:dsa_toggle') {
        const existing = await prisma.dsaDailyGoal.findUnique({
          where: { userId_date: { userId, date: today } },
        });
        const newState = existing ? !existing.completed : true;
        await prisma.dsaDailyGoal.upsert({
          where: { userId_date: { userId, date: today } },
          create: { userId, date: today, completed: true, solvedCount: 1 },
          update: { completed: newState },
        });
        await del(`cache:dashboard:stats:${userId}`).catch(() => {});
        const msg = newState
          ? `🎉 <b>Daily DSA Goal Completed!</b>\n\nGreat work, ${profile.name}! Keep the streak alive! 🔥`
          : `↩️ <b>Goal Reset</b>\n\nDaily goal marked as incomplete. You've got this! 💪`;
        await send(chatId, msg, {
          reply_markup: { inline_keyboard: [[{ text: '← Menu', callback_data: 'menu:main' }]] }
        });
        await answerCb(query.id, newState ? '✅ Goal Complete!' : '↩️ Goal Reset');
        return;
      }

      // ── INLINE KEYBOARD SAVES (text content) ─────────────────────────────
      const [action, tempId] = data.split(':');
      const session = tempStorage.get(tempId);

      if (!session) {
        await answerCb(query.id, '⏱ Session expired');
        return;
      }
      tempStorage.delete(tempId);

      if (action === 'save_task') {
        const task = await prisma.task.create({
          data: {
            userId,
            title: session.text || 'Untitled Task',
            status: 'TODO', priority: 'MEDIUM',
            scope: 'DAILY', dueDate: new Date(), category: 'TELEGRAM',
          },
        });
        await del(`cache:dashboard:stats:${userId}`).catch(() => {});
        await send(chatId, `✅ <b>Task Created!</b>\n\n📝 <b>${task.title}</b>\n<i>Priority: Medium · Due: Today</i>`);

      } else if (action === 'save_note') {
        const lines = (session.text || '').split('\n');
        const note  = await prisma.note.create({
          data: {
            userId,
            title: lines[0]?.substring(0, 100) || 'Telegram Note',
            content: lines.slice(1).join('\n') || '',
            category: 'Other',
          },
        });
        await send(chatId, `✅ <b>Note Saved!</b>\n\n📓 <b>${note.title}</b>`);

      } else if (action === 'save_job') {
        const parts   = (session.text || '').split('|').map(p => p.trim());
        const company = parts[0] || 'Unknown Company';
        const role    = parts[1] || 'Software Engineer';
        const salary  = parts[2] || null;
        const notes   = parts[3] || null;
        const job     = await prisma.job.create({
          data: { userId, company, role, status: 'APPLIED', salary, notes },
        });
        await del(`cache:dashboard:stats:${userId}`).catch(() => {});
        await send(chatId, `✅ <b>Job Application Logged!</b>\n\n💼 <b>${job.role}</b> at <b>${job.company}</b>\n📌 Status: Applied`);

      } else if (action === 'save_book') {
        const book = await prisma.book.create({
          data: {
            userId,
            title: session.filename?.replace(/\.[^/.]+$/, '') || 'Telegram Book',
            category: 'PRODUCTIVITY', fileUrl: session.fileUrl, readingStatus: 'WANT_TO_READ',
          },
        });
        await del(`cache:dashboard:stats:${userId}`).catch(() => {});
        await send(chatId, `✅ <b>Book Added to Library!</b>\n\n📚 <b>${book.title}</b>\n<i>Status: Want to Read</i>`);

      } else if (action === 'save_resource') {
        const resource = await prisma.resource.create({
          data: {
            userId,
            title: session.filename?.replace(/\.[^/.]+$/, '') || 'Telegram Resource',
            type: 'PDF', fileUrl: session.fileUrl, status: 'NOT_STARTED',
          },
        });
        await send(chatId, `✅ <b>Resource Saved!</b>\n\n📂 <b>${resource.title}</b>`);

      } else if (action === 'save_note_attach') {
        const filename = session.filename || 'Attachment';
        const note     = await prisma.note.create({
          data: {
            userId,
            title: `Attachment: ${filename}`,
            content: `Uploaded via Telegram on ${new Date().toLocaleDateString()}`,
            category: 'Other',
          },
        });
        await prisma.noteAttachment.create({
          data: {
            noteId: note.id,
            url: session.fileUrl || '',
            filename,
            mimeType: session.mimeType || 'application/octet-stream',
            size: session.size || 0,
          },
        });
        await send(chatId, `✅ <b>Note Attachment Saved!</b>\n\n📎 <b>${filename}</b> attached to note.`);
      }

      await answerCb(query.id);

    } catch (err) {
      console.error('❌ Callback Query Error:', err);
      await answerCb(query.id, '❌ Error occurred');
      try {
        await send(chatId, '❌ <b>Something went wrong.</b> Please try again.');
      } catch (_) { }
    }
  });

  // ── Message Handler ───────────────────────────────────────────────────────
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text   = msg.text?.trim();

    try {
      // ── /link <PIN> — no auth required ──────────────────────────────────
      if (text && /^\/link(\s|$)/i.test(text)) {
        const pin = text.split(/\s+/)[1]?.trim();
        if (!pin) {
          await bot!.sendMessage(chatId,
            `⚠️ <b>How to Link</b>\n\n` +
            `1. Go to <b>Settings → Telegram Integration</b> on your DevOS dashboard\n` +
            `2. Click <b>Generate PIN</b>\n` +
            `3. Send: <code>/link 123456</code>`,
            { parse_mode: 'HTML' }
          );
          return;
        }
        const target = await prisma.profile.findFirst({
          where: { telegramLinkToken: pin, telegramLinkExpiry: { gte: new Date() } },
        });
        if (!target) {
          await bot!.sendMessage(chatId,
            `❌ <b>Invalid or Expired PIN</b>\n\n` +
            `PINs expire after 15 minutes. Generate a new one from your dashboard.`,
            { parse_mode: 'HTML' }
          );
          return;
        }
        await prisma.profile.update({
          where: { id: target.id },
          data: {
            telegramChatId: chatId.toString(),
            notifTelegram: true,
            telegramLinkToken: null,
            telegramLinkExpiry: null,
          },
        });
        const menu = buildMainMenu(target.name);
        await bot!.sendMessage(chatId,
          `🎉 <b>Account Linked Successfully!</b>\n\n` +
          `Welcome to DevOS Bot, <b>${target.name}</b>!\n\n` +
          `Your Telegram is now connected. Here's what you can do:`,
          { parse_mode: 'HTML' }
        );
        await bot!.sendMessage(chatId, menu.text, { parse_mode: 'HTML', reply_markup: menu.keyboard });
        return;
      }

      // ── Fetch profile for everything else ────────────────────────────────
      const profile = await prisma.profile.findFirst({
        where: { telegramChatId: chatId.toString() },
        include: { user: true },
      });

      if (!profile) {
        if (text?.startsWith('/')) {
          await bot!.sendMessage(chatId,
            `❌ <b>Account Not Linked</b>\n\n` +
            `Your Telegram isn't connected to any DevOS account.\n\n` +
            `👉 Go to <b>Settings → Telegram Integration</b>, generate a PIN, then send:\n` +
            `<code>/link &lt;your-pin&gt;</code>\n\n` +
            `Your Chat ID: <code>${chatId}</code>`,
            { parse_mode: 'HTML' }
          );
        }
        return;
      }

      const userId  = profile.userId;
      const today   = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      // ── Check for multi-step conversation state ─────────────────────────
      const convState = tempStorage.get(chatId.toString());
      if (convState?.step && text && !text.startsWith('/')) {

        if (convState.step === 'await_task_title') {
          tempStorage.delete(chatId.toString());
          const task = await prisma.task.create({
            data: {
              userId, title: text.slice(0, 200),
              status: 'TODO', priority: 'MEDIUM',
              scope: 'DAILY', dueDate: new Date(), category: 'TELEGRAM',
            },
          });
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          await bot!.sendMessage(chatId,
            `✅ <b>Task Created!</b>\n\n📝 <b>${task.title}</b>\n<i>Due today · Priority: Medium</i>`,
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '← Menu', callback_data: 'menu:main' }]] } }
          );
          return;
        }

        if (convState.step === 'await_note') {
          tempStorage.delete(chatId.toString());
          const lines = text.split('\n');
          const note  = await prisma.note.create({
            data: {
              userId,
              title: lines[0]?.slice(0, 100) || 'Telegram Note',
              content: lines.slice(1).join('\n') || '',
              category: 'Other',
            },
          });
          await bot!.sendMessage(chatId,
            `✅ <b>Note Saved!</b>\n\n📓 <b>${note.title}</b>`,
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '← Menu', callback_data: 'menu:main' }]] } }
          );
          return;
        }

        if (convState.step === 'await_job') {
          tempStorage.delete(chatId.toString());
          const parts   = text.split('|').map(p => p.trim());
          const company = parts[0] || 'Unknown';
          const role    = parts[1] || 'Software Engineer';
          const salary  = parts[2] || null;
          const notes   = parts[3] || null;
          const job     = await prisma.job.create({
            data: { userId, company, role, status: 'APPLIED', salary, notes },
          });
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          await bot!.sendMessage(chatId,
            `✅ <b>Job Application Logged!</b>\n\n💼 <b>${job.role}</b> at <b>${job.company}</b>`,
            { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '← Menu', callback_data: 'menu:main' }]] } }
          );
          return;
        }
      }

      // ── Document / file upload ────────────────────────────────────────────
      if (msg.document) {
        await bot!.sendMessage(chatId, `⏳ <b>Uploading...</b>`, { parse_mode: 'HTML' });
        const fileId   = msg.document.file_id;
        const filename = msg.document.file_name || 'document.pdf';
        const mimeType = msg.document.mime_type || 'application/octet-stream';
        const size     = msg.document.file_size || 0;

        const fileLink   = await bot!.getFileLink(fileId);
        const response   = await fetch(fileLink);
        const arrayBuf   = await response.arrayBuffer();
        const buffer     = Buffer.from(arrayBuf);
        const fileUrl    = await uploadFile({ originalname: filename, buffer, mimetype: mimeType, size } as any, 'telegram');

        const tempId = Math.random().toString(36).slice(2, 9);
        tempStorage.set(tempId, { fileUrl, filename, mimeType, size });

        await bot!.sendMessage(chatId,
          `📂 <b>File Uploaded!</b>\n\n` +
          `📄 <b>${filename}</b>\n` +
          `📦 ${(size / 1024).toFixed(1)} KB\n\n` +
          `Where would you like to save this?`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📚 Save as Book', callback_data: `save_book:${tempId}` },
                  { text: '📂 Save as Resource', callback_data: `save_resource:${tempId}` },
                ],
                [
                  { text: '📎 Attach to Note', callback_data: `save_note_attach:${tempId}` },
                ],
              ]
            }
          }
        );
        return;
      }

      if (!text) return;

      // ── Command router ────────────────────────────────────────────────────
      if (text.startsWith('/')) {
        const parts   = text.split(/\s+/);
        const command = parts[0].toLowerCase().split('@')[0];
        const args    = parts.slice(1).join(' ');

        // /start | /help | /menu
        if (['/start', '/help', '/menu'].includes(command)) {
          const menu = buildMainMenu(profile.name);
          await bot!.sendMessage(chatId, menu.text, { parse_mode: 'HTML', reply_markup: menu.keyboard });
          return;
        }

        // /me
        if (command === '/me') {
          const jobCount = await prisma.job.count({ where: { userId } });
          const dsaCount = await prisma.dsaProblem.count({ where: { userId } });
          const noteCount = await prisma.note.count({ where: { userId } });
          await bot!.sendMessage(chatId,
            `👤 <b>Your Profile</b>\n${divider()}\n\n` +
            `🏷 Name: <b>${profile.name}</b>\n` +
            `📧 Email: ${profile.user?.email || '—'}\n` +
            `🧠 DSA Problems: <b>${dsaCount}</b>\n` +
            `📓 Notes: <b>${noteCount}</b>\n` +
            `💼 Job Apps: <b>${jobCount}</b>\n` +
            `🤖 Chat ID: <code>${chatId}</code>`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // /cancel
        if (command === '/cancel') {
          tempStorage.delete(chatId.toString());
          await bot!.sendMessage(chatId, `❌ Cancelled.`, { parse_mode: 'HTML' });
          return;
        }

        // /tasks
        if (command === '/tasks') {
          const tasks = await prisma.task.findMany({
            where: {
              userId,
              status: { in: ['TODO', 'IN_PROGRESS'] },
              OR: [{ dueDate: null }, { dueDate: { lte: todayEnd } }],
            },
            orderBy: [{ priority: 'desc' }],
            take: 20,
          });
          const priorityIcon: Record<string, string> = { URGENT: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
          if (!tasks.length) {
            await bot!.sendMessage(chatId, `🎉 <b>All clear!</b> No pending tasks.`, { parse_mode: 'HTML' });
            return;
          }
          let list = `📝 <b>Pending Tasks (${tasks.length})</b>\n${divider()}\n\n`;
          tasks.forEach((t: any, i: number) => { list += `${i + 1}. ${priorityIcon[t.priority] || '⚪'} <b>${t.title}</b>\n`; });
          list += `\n<i>/done &lt;n&gt; to complete</i>`;
          await bot!.sendMessage(chatId, list, { parse_mode: 'HTML' });
          return;
        }

        // /task <title>
        if (command === '/task') {
          if (!args) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/task revise graphs</code>`, { parse_mode: 'HTML' });
            return;
          }
          const task = await prisma.task.create({
            data: { userId, title: args.slice(0, 200), status: 'TODO', priority: 'MEDIUM', scope: 'DAILY', dueDate: new Date(), category: 'TELEGRAM' },
          });
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          await bot!.sendMessage(chatId, `✅ <b>Task Created:</b> ${task.title}`, { parse_mode: 'HTML' });
          return;
        }

        // /done <n>
        if (command === '/done') {
          const n = parseInt(args, 10);
          if (isNaN(n) || n <= 0) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/done 2</code>`, { parse_mode: 'HTML' });
            return;
          }
          const tasks = await prisma.task.findMany({
            where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] }, OR: [{ dueDate: null }, { dueDate: { lte: todayEnd } }] },
            orderBy: [{ priority: 'desc' }],
          });
          if (n > tasks.length) {
            await bot!.sendMessage(chatId, `❌ No task #${n}. Send /tasks to see the list.`, { parse_mode: 'HTML' });
            return;
          }
          const t = tasks[n - 1];
          await prisma.task.update({ where: { id: t.id }, data: { status: 'DONE' } });
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          await bot!.sendMessage(chatId, `✅ <b>Done:</b> ${t.title}`, { parse_mode: 'HTML' });
          return;
        }

        // /dsa
        if (command === '/dsa') {
          const revisions = await prisma.dsaRevision.findMany({
            where: { problem: { userId }, dueDate: { lte: todayEnd }, completedAt: null },
            include: { problem: { select: { name: true, platform: true, difficulty: true } } },
            take: 15,
          });
          if (!revisions.length) {
            await bot!.sendMessage(chatId, `🎉 <b>No DSA revisions due today!</b>`, { parse_mode: 'HTML' });
            return;
          }
          const diff: Record<string, string> = { EASY: '🟢', MEDIUM: '🟡', HARD: '🔴' };
          let list = `📚 <b>DSA Due Today (${revisions.length})</b>\n${divider()}\n\n`;
          revisions.forEach((r: any, i: number) => {
            list += `${i + 1}. ${diff[r.problem.difficulty]} <b>${r.problem.name}</b> <i>(${r.problem.platform})</i>\n`;
          });
          await bot!.sendMessage(chatId, list, { parse_mode: 'HTML' });
          return;
        }

        // /dsastatus
        if (command === '/dsastatus') {
          const goal = await prisma.dsaDailyGoal.findUnique({ where: { userId_date: { userId, date: today } } });
          const msg  =
            `📊 <b>DSA Daily Goal — ${format(today, 'dd MMM yyyy')}</b>\n${divider()}\n\n` +
            `${goal?.completed ? '✅' : '⏳'} Status: <b>${goal?.completed ? 'Completed' : 'Pending'}</b>\n` +
            `🔢 Problems today: <b>${goal?.solvedCount ?? 0}</b>`;
          await bot!.sendMessage(chatId, msg, { parse_mode: 'HTML' });
          return;
        }

        // /dsadone
        if (command === '/dsadone') {
          const existing = await prisma.dsaDailyGoal.findUnique({ where: { userId_date: { userId, date: today } } });
          const newState = existing ? !existing.completed : true;
          await prisma.dsaDailyGoal.upsert({
            where: { userId_date: { userId, date: today } },
            create: { userId, date: today, completed: true, solvedCount: 1 },
            update: { completed: newState },
          });
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          await bot!.sendMessage(chatId,
            newState
              ? `🎉 <b>Daily DSA Goal Complete!</b>\n\nGood job! Keep the streak alive. 🔥`
              : `↩️ <b>Goal Reset.</b> No worries, keep going!`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // /ghstatus
        if (command === '/ghstatus') {
          const activity = await prisma.githubActivity.findFirst({ where: { userId, date: today } });
          const commits  = activity?.commits || 0;
          const repos    = (activity?.repositories as string[] | null)?.join(', ') || '—';
          const status   = commits > 0 ? '✅ <b>Streak Active!</b>' : '⚠️ <b>No commits yet today</b>';
          await bot!.sendMessage(chatId,
            `🐙 <b>GitHub Status</b>\n${divider()}\n\n` +
            `${status}\n\n` +
            `📦 Commits: <b>${commits}</b>\n` +
            `🗂 Repos: ${repos}\n\n` +
            `<i>Push before midnight to keep your streak! 🌙</i>`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // /ghcommits [n]
        if (command === '/ghcommits') {
          const days     = Math.min(parseInt(args, 10) || 7, 30);
          const since    = startOfDay(subDays(new Date(), days - 1));
          const activities = await prisma.githubActivity.findMany({
            where: { userId, date: { gte: since } },
            orderBy: { date: 'asc' },
          });
          if (!activities.length) {
            await bot!.sendMessage(chatId, `📊 No GitHub activity in the last <b>${days}</b> days.`, { parse_mode: 'HTML' });
            return;
          }
          const total = activities.reduce((s: number, a: any) => s + a.commits, 0);
          const lines = activities.map((a: any) =>
            `• <b>${format(new Date(a.date), 'EEE dd MMM')}</b> — ${a.commits} commit${a.commits !== 1 ? 's' : ''}`
          );
          await bot!.sendMessage(chatId,
            `🐙 <b>GitHub — Last ${days} Days</b>\n${divider()}\n\n` +
            lines.join('\n') +
            `\n\n${divider()}\n📊 Total: <b>${total} commits</b>`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // /github (legacy alias)
        if (command === '/github') {
          const activity = await prisma.githubActivity.findFirst({ where: { userId, date: today } });
          const commits  = activity?.commits || 0;
          await bot!.sendMessage(chatId,
            commits > 0
              ? `✅ <b>GitHub Streak Active!</b> ${commits} commit(s) today. 🚀`
              : `⚠️ <b>No commits today.</b> Push before midnight! 💻`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // Unknown command
        await bot!.sendMessage(chatId,
          `🤔 Unknown command. Send /help to see all available commands.`,
          { parse_mode: 'HTML' }
        );
        return;
      }

      // ── Plain text → interactive organizer ─────────────────────────────────
      const tempId = Math.random().toString(36).slice(2, 9);
      tempStorage.set(tempId, { text });

      const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
      await bot!.sendMessage(chatId,
        `📥 <b>Got it!</b>\n\n<i>"${preview}"</i>\n\nWhat would you like to do with this?`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📝 Save as Task', callback_data: `save_task:${tempId}` },
                { text: '📓 Save as Note', callback_data: `save_note:${tempId}` },
              ],
              [
                { text: '💼 Log as Job App', callback_data: `save_job:${tempId}` },
              ],
            ]
          }
        }
      );

    } catch (error) {
      console.error('❌ Message handler error:', error);
      try {
        await bot!.sendMessage(chatId,
          `❌ <b>Something went wrong.</b>\n\nPlease try again. If the issue persists, use /help.`,
          { parse_mode: 'HTML' }
        );
      } catch (_) { }
    }
  });
}
