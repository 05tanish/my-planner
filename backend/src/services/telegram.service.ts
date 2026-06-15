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

export const sendHighPriorityTaskAlert = async (chatId: string, taskTitle: string, priority: string) => {
  const priorityIcon = priority === 'CRITICAL' ? '🔴' : '🟠';
  await sendTelegramMessage(chatId,
    `${priorityIcon} <b>High Priority Task Alert</b>\n\n` +
    `<b>${taskTitle}</b>\n\n` +
    `Priority: <b>${priority}</b>\n` +
    `This task needs your immediate attention!\n\n` +
    `Use /priority to see all urgent tasks.`
  );
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

// Helper to get user token (for API calls from Telegram bot)
async function getUserToken(userId: string): Promise<string> {
  // In production, use proper session token management
  // For now, create a temporary token or use service account
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: '1h' });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function divider() { return '─'.repeat(28); }

function buildMainMenu(name: string) {
  return {
    text:
      `🤖 <b>DevOS Assistant</b> — Hey <b>${name}</b>! 👋\n\n` +
      `<i>Your personal productivity companion</i>\n\n` +
      `${divider()}\n` +
      `Quick Actions:`,
    keyboard: {
      inline_keyboard: [
        [
          { text: '📝 My Tasks', callback_data: 'menu:tasks' },
          { text: '📊 Dashboard', callback_data: 'menu:dashboard' },
        ],
        [
          { text: '➕ Add Task', callback_data: 'menu:add_task' },
          { text: '📓 Add Note', callback_data: 'menu:add_note' },
        ],
        [
          { text: '💼 Log Job App', callback_data: 'menu:add_job' },
          { text: '📚 DSA Done', callback_data: 'action:dsa_toggle' },
        ],
        [
          { text: '🐙 GitHub', callback_data: 'menu:github' },
          { text: '📖 Book', callback_data: 'menu:add_book' },
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
          `• /tasks — view pending tasks\n` +
          `• /task [title] — create task\n` +
          `• /bulk — create multiple tasks\n` +
          `• /done [n] — mark task complete\n` +
          `• /priority — urgent tasks\n` +
          `• /time [hours] — capacity check\n\n` +
          `<b>📚 DSA</b>\n` +
          `• /dsa — revisions due today\n` +
          `• /dsastatus — goal status\n` +
          `• /dsadone — toggle daily goal\n\n` +
          `<b>🐙 GitHub</b>\n` +
          `• /ghstatus — today's activity\n` +
          `• /commit [n] — update count\n` +
          `• /ghcommits [n] — last n days\n\n` +
          `<b>💼 Career</b>\n` +
          `• /apply [company] | [role]\n` +
          `• /project [name] — create project\n` +
          `• /hackathon [name] — track event\n` +
          `• /idea [description] — save idea\n\n` +
          `<b>🧠 Learning</b>\n` +
          `• /save [url] — capture knowledge\n` +
          `• /openclaw [topic] — AI research\n\n` +
          `<b>📊 Dashboard</b>\n` +
          `• /stats — quick overview\n` +
          `• /review — daily summary\n` +
          `• /alerts — view alerts\n` +
          `• /remind [text] — set reminder\n` +
          `• /me — your profile\n\n` +
          `<b>🔗 Account</b>\n` +
          `• /link [6-digit-pin] — connect account`;
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
        const [tasksPending, tasksDone, dsaTotal, dsaGoal, githubToday, activeJobs, activeProjects, booksReading, notesCount] = await Promise.all([
          prisma.task.count({ where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
          prisma.task.count({ where: { userId, status: 'DONE', completedAt: { gte: today } } }),
          prisma.dsaProblem.count({ where: { userId } }),
          prisma.dsaDailyGoal.findUnique({ where: { userId_date: { userId, date: today } } }),
          prisma.githubActivity.findFirst({ where: { userId, date: today } }),
          prisma.job.count({ where: { userId, status: { in: ['APPLIED', 'OA', 'INTERVIEW'] } } }),
          prisma.project.count({ where: { userId, status: 'ACTIVE' } }),
          prisma.book.count({ where: { userId, readingStatus: 'READING' } }),
          prisma.note.count({ where: { userId } }),
        ]);
        const text =
          `📊 <b>Dashboard Summary</b>\n${divider()}\n\n` +
          `<b>📝 Today:</b>\n` +
          `• Pending: ${tasksPending} tasks\n` +
          `• Completed: ${tasksDone} tasks ✅\n` +
          `• DSA Goal: ${dsaGoal?.completed ? 'Done ✅' : 'Pending ⏳'}\n` +
          `• Commits: ${githubToday?.commits || 0} 🐙\n\n` +
          `<b>📚 Overall:</b>\n` +
          `• DSA Problems: ${dsaTotal}\n` +
          `• Active Jobs: ${activeJobs} 💼\n` +
          `• Projects: ${activeProjects} 📁\n` +
          `• Books Reading: ${booksReading} 📖\n` +
          `• Notes: ${notesCount} 📓\n\n` +
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

        if (convState.step === 'await_bulk_tasks') {
          tempStorage.delete(chatId.toString());
          const lines = text.split('\n').filter(l => l.trim());
          
          if (lines.length === 0) {
            await bot!.sendMessage(chatId, `⚠️ No tasks provided. Send /bulk to try again.`, { parse_mode: 'HTML' });
            return;
          }
          
          const tasks = await Promise.all(
            lines.map(line => {
              // Parse priority from ! marks
              let priority = 'MEDIUM';
              let title = line.trim();
              
              const urgentMatch = title.match(/^(!{1,3})\s*(.+)/);
              if (urgentMatch) {
                const marks = urgentMatch[1].length;
                if (marks === 3) priority = 'CRITICAL';
                else if (marks === 2) priority = 'HIGH';
                else priority = 'MEDIUM';
                title = urgentMatch[2];
              }
              
              return prisma.task.create({
                data: {
                  userId,
                  title: title.slice(0, 200),
                  status: 'TODO',
                  priority: priority as any,
                  scope: 'DAILY',
                  dueDate: new Date(),
                  category: 'TELEGRAM',
                },
              });
            })
          );
          
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          
          const priorityIcon: Record<string, string> = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
          const taskList = tasks.map((t, i) => `${i + 1}. ${priorityIcon[t.priority]} ${t.title}`).join('\n');
          
          await bot!.sendMessage(chatId,
            `✅ <b>${tasks.length} Tasks Created!</b>\n${divider()}\n\n${taskList}\n\n` +
            `<i>💡 Tip: Use !!! for critical, !! for high priority</i>`,
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

        // ── NEW PHASE 3 COMMANDS ─────────────────────────────────────────────────

        // /project <name> - Create project
        if (command === '/project') {
          if (!args) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/project Chat Application</code>`, { parse_mode: 'HTML' });
            return;
          }
          const project = await prisma.project.create({
            data: { userId, name: args, status: 'ACTIVE', priority: 'MEDIUM', techStack: [], features: { create: [] } },
          });
          await bot!.sendMessage(chatId, `✅ <b>Project Created:</b> ${project.name}\n\n📊 Status: Active\n\n<i>Add details at /projects page</i>`, { parse_mode: 'HTML' });
          return;
        }

        // /projects - List all projects
        if (command === '/projects') {
          const projects = await prisma.project.findMany({
            where: { userId, status: { in: ['ACTIVE', 'ON_HOLD'] } },
            orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
            take: 10,
            include: { features: true }
          });
          
          if (!projects.length) {
            await bot!.sendMessage(chatId, `📁 <b>No active projects.</b>\n\nCreate one with: <code>/project Project Name</code>`, { parse_mode: 'HTML' });
            return;
          }
          
          let list = `📁 <b>Your Projects (${projects.length})</b>\n${divider()}\n\n`;
          projects.forEach((p: any, i: number) => {
            const completed = p.features.filter((f: any) => f.status === 'COMPLETED').length;
            const total = p.features.length;
            list += `${i + 1}. <b>${p.name}</b>\n`;
            list += `   📊 ${p.completionPercentage}% • ${completed}/${total} features\n`;
            list += `   🔖 ${p.status}\n\n`;
          });
          await bot!.sendMessage(chatId, list, { parse_mode: 'HTML' });
          return;
        }

        // /interview <question> - Add interview question
        if (command === '/interview') {
          if (!args) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/interview Explain REST vs GraphQL</code>`, { parse_mode: 'HTML' });
            return;
          }
          const question = await prisma.interviewQuestion.create({
            data: { userId, question: args, category: 'BACKEND', difficulty: 'MEDIUM', tags: ['telegram'] },
          });
          await bot!.sendMessage(chatId, `✅ <b>Interview Question Added!</b>\n\n❓ ${question.question}\n\n<i>Add answer at /interviews page</i>`, { parse_mode: 'HTML' });
          return;
        }

        // /interviews - List recent questions
        if (command === '/interviews') {
          const questions = await prisma.interviewQuestion.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10
          });
          
          if (!questions.length) {
            await bot!.sendMessage(chatId, `📝 <b>No interview questions yet.</b>\n\nAdd one with: <code>/interview Your question?</code>`, { parse_mode: 'HTML' });
            return;
          }
          
          let list = `📝 <b>Interview Questions (${questions.length})</b>\n${divider()}\n\n`;
          questions.forEach((q: any, i: number) => {
            const diff: Record<string, string> = { EASY: '🟢', MEDIUM: '🟡', HARD: '🔴', EXPERT: '⚫' };
            list += `${i + 1}. ${diff[q.difficulty]} <b>${q.question.slice(0, 60)}${q.question.length > 60 ? '...' : ''}</b>\n`;
            list += `   📂 ${q.category}\n\n`;
          });
          await bot!.sendMessage(chatId, list, { parse_mode: 'HTML' });
          return;
        }

        // /habit <type> - Log habit (DSA, CODING, READING, EXERCISE, etc.)
        if (command === '/habit') {
          const habitType = args.toUpperCase();
          const validTypes = ['DSA', 'CODING', 'READING', 'EXERCISE', 'JOB_APPLICATIONS', 'LEARNING', 'COMMITS'];
          
          if (!validTypes.includes(habitType)) {
            await bot!.sendMessage(chatId, 
              `⚠️ Usage: <code>/habit TYPE</code>\n\n` +
              `Valid types: ${validTypes.join(', ')}`,
              { parse_mode: 'HTML' }
            );
            return;
          }
          
          await prisma.habitLog.create({
            data: { userId, habitType: habitType as any, date: today, count: 1 }
          });
          
          await bot!.sendMessage(chatId, `✅ <b>Habit Logged!</b>\n\n${habitType} completed for today 🎉`, { parse_mode: 'HTML' });
          return;
        }

        // /habits - View today's habits
        if (command === '/habits') {
          const logs = await prisma.habitLog.findMany({
            where: { userId, date: today }
          });
          
          const habitTypes = ['DSA', 'CODING', 'READING', 'EXERCISE', 'JOB_APPLICATIONS', 'LEARNING', 'COMMITS'];
          const completed = logs.map(l => l.habitType);
          
          let text = `🔥 <b>Today's Habits</b>\n${divider()}\n\n`;
          habitTypes.forEach(type => {
            const done = completed.includes(type as any);
            text += `${done ? '✅' : '⏳'} ${type}\n`;
          });
          text += `\n<b>${completed.length}/${habitTypes.length}</b> completed\n\n`;
          text += `<i>Log with: /habit TYPE</i>`;
          
          await bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
          return;
        }

        // /opportunity <name> - Add opportunity
        if (command === '/opportunity') {
          if (!args) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/opportunity Google Summer of Code 2026</code>`, { parse_mode: 'HTML' });
            return;
          }
          const opportunity = await prisma.opportunity.create({
            data: { userId, name: args, category: 'OPEN_SOURCE_PROGRAM', status: 'DISCOVERED', tags: [] }
          });
          await bot!.sendMessage(chatId, `✅ <b>Opportunity Added!</b>\n\n🎯 ${opportunity.name}\n\n<i>Track at /opportunities page</i>`, { parse_mode: 'HTML' });
          return;
        }

        // /opportunities - List opportunities
        if (command === '/opportunities') {
          const opportunities = await prisma.opportunity.findMany({
            where: { userId, status: { notIn: ['REJECTED', 'COMPLETED'] } },
            orderBy: { deadline: 'asc' },
            take: 10
          });
          
          if (!opportunities.length) {
            await bot!.sendMessage(chatId, `🎯 <b>No active opportunities.</b>\n\nAdd one with: <code>/opportunity Name</code>`, { parse_mode: 'HTML' });
            return;
          }
          
          let list = `🎯 <b>Opportunities (${opportunities.length})</b>\n${divider()}\n\n`;
          opportunities.forEach((o: any, i: number) => {
            list += `${i + 1}. <b>${o.name}</b>\n`;
            list += `   📂 ${o.category} • ${o.status}\n`;
            if (o.deadline) {
              const daysLeft = differenceInDays(new Date(o.deadline), new Date());
              list += `   ⏰ ${daysLeft} days left\n`;
            }
            list += `\n`;
          });
          await bot!.sendMessage(chatId, list, { parse_mode: 'HTML' });
          return;
        }

        // /commit <count> - Update today's commit count
        if (command === '/commit') {
          const count = parseInt(args, 10);
          if (isNaN(count) || count < 0) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/commit 5</code>`, { parse_mode: 'HTML' });
            return;
          }
          await prisma.githubActivity.upsert({
            where: { userId_date: { userId, date: today } },
            create: { userId, date: today, commits: count, repositories: [] },
            update: { commits: count },
          });
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          await bot!.sendMessage(chatId, `🐙 <b>Commits Updated!</b>\n\n📦 Today: <b>${count} commits</b>`, { parse_mode: 'HTML' });
          return;
        }

        // /save <url> - Save knowledge from URL
        if (command === '/save') {
          if (!args) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/save https://youtube.com/watch?v=...</code>`, { parse_mode: 'HTML' });
            return;
          }
          const url = args.trim();
          let sourceType = 'OTHER';
          if (url.includes('youtube.com') || url.includes('youtu.be')) sourceType = 'YOUTUBE';
          else if (url.includes('github.com')) sourceType = 'GITHUB_REPO';
          else if (url.includes('twitter.com') || url.includes('x.com')) sourceType = 'TWEET';
          
          const knowledge = await prisma.knowledgeCapture.create({
            data: {
              userId,
              sourceType: sourceType as any,
              sourceUrl: url,
              title: `Saved from Telegram`,
              tags: ['telegram', 'quick-capture'],
            },
          });
          await bot!.sendMessage(chatId, 
            `✅ <b>Knowledge Captured!</b>\n\n` +
            `🔖 Source: ${sourceType}\n` +
            `🔗 <a href="${url}">View Link</a>\n\n` +
            `<i>Process this later from Learning Hub</i>`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // /apply <company> | <role> - Add job application
        if (command === '/apply') {
          if (!args || !args.includes('|')) {
            await bot!.sendMessage(chatId, 
              `⚠️ Usage: <code>/apply Google | SWE Intern</code>`,
              { parse_mode: 'HTML' }
            );
            return;
          }
          const parts = args.split('|').map(p => p.trim());
          const company = parts[0] || 'Unknown';
          const role = parts[1] || 'Software Engineer';
          const job = await prisma.job.create({
            data: { userId, company, role, status: 'APPLIED' },
          });
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          await bot!.sendMessage(chatId, 
            `✅ <b>Job Application Logged!</b>\n\n` +
            `💼 <b>${role}</b>\n` +
            `🏢 ${company}\n` +
            `📌 Status: Applied`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // /hackathon <name> - Add hackathon
        if (command === '/hackathon') {
          if (!args) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/hackathon Hack The North 2026</code>`, { parse_mode: 'HTML' });
            return;
          }
          const hackathon = await prisma.hackathon.create({
            data: { userId, name: args, status: 'REGISTERED', teamMembers: [] },
          });
          await bot!.sendMessage(chatId, `🏆 <b>Hackathon Added!</b>\n\n${hackathon.name}\n📌 Status: Registered`, { parse_mode: 'HTML' });
          return;
        }

        // /idea <project idea> - Save project idea
        if (command === '/idea') {
          if (!args) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/idea Real-time collaborative code editor</code>`, { parse_mode: 'HTML' });
            return;
          }
          const project = await prisma.project.create({
            data: { userId, name: args, status: 'IDEA', priority: 'LOW' },
          });
          await bot!.sendMessage(chatId, `💡 <b>Project Idea Saved!</b>\n\n${project.name}`, { parse_mode: 'HTML' });
          return;
        }

        // /remind <message> - Create reminder
        if (command === '/remind') {
          if (!args) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/remind Review system design notes</code>`, { parse_mode: 'HTML' });
            return;
          }
          const reminder = await prisma.reminder.create({
            data: {
              userId,
              type: 'CUSTOM',
              message: args,
              cronExpr: '0 9 * * *', // Daily at 9 AM
              channels: ['TELEGRAM'],
            },
          });
          await bot!.sendMessage(chatId, `⏰ <b>Reminder Created!</b>\n\n${args}\n\n<i>Will remind daily at 9 AM</i>`, { parse_mode: 'HTML' });
          return;
        }

        // /review - Get daily review
        if (command === '/review') {
          const [tasksCompleted, dsaToday, commits, apps] = await Promise.all([
            prisma.task.count({ where: { userId, status: 'DONE', completedAt: { gte: today } } }),
            prisma.dsaDailyGoal.findUnique({ where: { userId_date: { userId, date: today } } }),
            prisma.githubActivity.findFirst({ where: { userId, date: today } }),
            prisma.job.count({ where: { userId, createdAt: { gte: today } } }),
          ]);
          
          const text = 
            `📊 <b>Today's Review</b>\n${divider()}\n\n` +
            `✅ Tasks Completed: <b>${tasksCompleted}</b>\n` +
            `🧠 DSA Goal: ${dsaToday?.completed ? '✅ Done' : '⏳ Pending'}\n` +
            `🐙 Commits: <b>${commits?.commits || 0}</b>\n` +
            `💼 Applications: <b>${apps}</b>\n\n` +
            `<i>${format(new Date(), 'EEEE, dd MMM yyyy')}</i>`;
          
          await bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
          return;
        }

        // /time <hours> - Allocate study time
        if (command === '/time') {
          const hours = parseFloat(args);
          if (isNaN(hours) || hours <= 0) {
            await bot!.sendMessage(chatId, `⚠️ Usage: <code>/time 8</code> (hours available today)`, { parse_mode: 'HTML' });
            return;
          }
          
          // Get today's tasks with estimated time
          const tasks = await prisma.task.findMany({
            where: {
              userId,
              status: { in: ['TODO', 'IN_PROGRESS'] },
              dueDate: { gte: today, lte: todayEnd },
            },
          });
          
          const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
          const totalHours = totalEstimated / 60;
          const remaining = hours - totalHours;
          
          const text = 
            `⏰ <b>Time Allocation - Today</b>\n${divider()}\n\n` +
            `📅 Available: <b>${hours}h</b>\n` +
            `📊 Assigned: <b>${totalHours.toFixed(1)}h</b>\n` +
            `⏳ Remaining: <b>${remaining.toFixed(1)}h</b>\n\n` +
            `${remaining < 0 ? '⚠️ <b>Overloaded!</b> Remove some tasks.' : '✅ <b>Capacity looks good!</b>'}`;
          
          await bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
          return;
        }

        // /bulk - Initiate bulk task creation
        if (command === '/bulk') {
          tempStorage.set(chatId.toString(), { step: 'await_bulk_tasks' });
          await bot!.sendMessage(chatId,
            `📝 <b>Bulk Task Creation</b>\n\n` +
            `Send tasks one per line:\n\n` +
            `<i>Example:</i>\n` +
            `<code>Complete Redis Setup\nFinish Dockerfile\nRevise Binary Trees\nApply To 5 Companies</code>\n\n` +
            `💡 <b>Advanced Format:</b>\n` +
            `Add priority with ! marks:\n` +
            `<code>!!! Critical Task\n!! High Priority Task\n! Medium Task\nNormal Task</code>\n\n` +
            `<i>(or /cancel to abort)</i>`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // /task <priority> <title> - Create task with priority
        if (command === '/task') {
          if (!args) {
            await bot!.sendMessage(chatId, 
              `⚠️ Usage:\n` +
              `<code>/task Task title</code>\n` +
              `<code>/task priority:high Important task</code>\n` +
              `<code>/task priority:urgent Fix bug now</code>`,
              { parse_mode: 'HTML' }
            );
            return;
          }
          
          // Parse priority
          let priority = 'MEDIUM';
          let title = args;
          
          const priorityMatch = args.match(/^priority:(urgent|critical|high|medium|low)\s+(.+)/i);
          if (priorityMatch) {
            priority = priorityMatch[1].toUpperCase();
            if (priority === 'URGENT') priority = 'CRITICAL';
            title = priorityMatch[2];
          }
          
          const task = await prisma.task.create({
            data: { 
              userId, 
              title: title.slice(0, 200), 
              status: 'TODO', 
              priority: priority as any, 
              scope: 'DAILY', 
              dueDate: new Date(), 
              category: 'TELEGRAM' 
            },
          });
          await del(`cache:dashboard:stats:${userId}`).catch(() => {});
          
          const priorityIcon = priority === 'CRITICAL' ? '🔴' : priority === 'HIGH' ? '🟠' : '🟡';
          await bot!.sendMessage(chatId, 
            `✅ <b>Task Created:</b> ${task.title}\n` +
            `${priorityIcon} Priority: <b>${priority}</b>\n` +
            `📅 Due: Today`,
            { parse_mode: 'HTML' }
          );
          return;
        }

        // /openclaw <query> - AI Research Assistant (Uses OpenAI GPT)
        if (command === '/openclaw' || command === '/research') {
          if (!args) {
            await bot!.sendMessage(chatId, 
              `⚠️ Usage: <code>/openclaw redis pub/sub</code>\n\n` +
              `<i>🤖 Powered by AI - add OPENAI_API_KEY to .env for full features</i>`, 
              { parse_mode: 'HTML' }
            );
            return;
          }
          
          await bot!.sendMessage(chatId, `🤖 <b>Researching:</b> ${args}\n\n⏳ Please wait...`, { parse_mode: 'HTML' });
          
          try {
            // Call knowledge research endpoint
            const response = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/knowledge/research`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getUserToken(userId)}`
              },
              body: JSON.stringify({ query: args })
            });
            
            const data: any = await response.json();
            
            const message = 
              `🧠 <b>Research: ${args}</b>\n${divider()}\n\n` +
              `📚 <b>Beginner Explanation:</b>\n${data.researchData?.beginnerExplanation?.slice(0, 300) || 'N/A'}...\n\n` +
              `💼 <b>Interview Focus:</b>\n${data.researchData?.interviewNotes?.slice(0, 300) || 'N/A'}...\n\n` +
              `🚀 <b>Production Tips:</b>\n${data.researchData?.productionNotes?.slice(0, 300) || 'N/A'}...\n\n` +
              `🔗 <b>Resources:</b>\n${data.researchData?.resourceLinks?.slice(0, 2).join('\n') || 'N/A'}\n\n` +
              `💾 <i>Full details saved to Knowledge Base</i>`;
            
            await bot!.sendMessage(chatId, message, { parse_mode: 'HTML' });
          } catch (error) {
            await bot!.sendMessage(chatId, `❌ Research failed. Try again later.`, { parse_mode: 'HTML' });
          }
          return;
        }

        // /alerts - View active alerts
        if (command === '/alerts') {
          const alerts = await prisma.alert.findMany({
            where: { userId, dismissed: false },
            orderBy: { level: 'desc' },
            take: 10
          });
          
          if (alerts.length === 0) {
            await bot!.sendMessage(chatId, `✅ <b>All Clear!</b>\n\nNo active alerts.`, { parse_mode: 'HTML' });
            return;
          }
          
          const levelIcon: Record<string, string> = { CRITICAL: '🔴', HIGH: '🟠', NORMAL: '🔵' };
          let text = `🔔 <b>Active Alerts (${alerts.length})</b>\n${divider()}\n\n`;
          
          alerts.forEach((a: any, i: number) => {
            text += `${levelIcon[a.level]} <b>${a.title}</b>\n${a.message}\n\n`;
          });
          
          text += `<i>Visit /alerts page to manage</i>`;
          await bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
          return;
        }

        // /priority - List high priority tasks
        if (command === '/priority' || command === '/urgent') {
          const tasks = await prisma.task.findMany({
            where: {
              userId,
              status: { in: ['TODO', 'IN_PROGRESS'] },
              priority: { in: ['URGENT', 'CRITICAL', 'HIGH'] }
            },
            orderBy: [{ priority: 'desc' }],
            take: 10
          });
          
          if (!tasks.length) {
            await bot!.sendMessage(chatId, `✅ <b>No urgent tasks!</b>\n\nYou're all caught up.`, { parse_mode: 'HTML' });
            return;
          }
          
          const priorityIcon: Record<string, string> = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡' };
          let list = `⚠️ <b>High Priority Tasks (${tasks.length})</b>\n${divider()}\n\n`;
          tasks.forEach((t: any, i: number) => {
            list += `${i + 1}. ${priorityIcon[t.priority]} <b>${t.title}</b>\n`;
          });
          list += `\n<i>/done &lt;n&gt; to complete</i>`;
          await bot!.sendMessage(chatId, list, { parse_mode: 'HTML' });
          return;
        }

        // /stats - Quick stats overview
        if (command === '/stats') {
          const [tasks, dsa, commits, jobs, projects] = await Promise.all([
            prisma.task.count({ where: { userId, status: 'DONE', completedAt: { gte: today } } }),
            prisma.dsaDailyGoal.findUnique({ where: { userId_date: { userId, date: today } } }),
            prisma.githubActivity.findFirst({ where: { userId, date: today } }),
            prisma.job.count({ where: { userId, createdAt: { gte: today } } }),
            prisma.project.count({ where: { userId, status: 'ACTIVE' } })
          ]);
          
          const text = 
            `📊 <b>Quick Stats</b>\n${divider()}\n\n` +
            `<b>Today:</b>\n` +
            `✅ Tasks: ${tasks}\n` +
            `🧠 DSA: ${dsa?.completed ? 'Done ✅' : 'Pending ⏳'}\n` +
            `🐙 Commits: ${commits?.commits || 0}\n` +
            `💼 Applications: ${jobs}\n\n` +
            `<b>Overall:</b>\n` +
            `📁 Active Projects: ${projects}\n\n` +
            `<i>${format(new Date(), 'EEEE, dd MMM yyyy')}</i>`;
          
          await bot!.sendMessage(chatId, text, { parse_mode: 'HTML' });
          return;
        }

        // ── END NEW COMMANDS ─────────────────────────────────────────────────

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
