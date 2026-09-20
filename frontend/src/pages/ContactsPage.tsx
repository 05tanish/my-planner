import React, { useEffect, useState } from 'react';
import {
  Plus, Search, Trash2, Edit2, Loader2, Mail, Phone, MessageCircle,
  Building2, Users, ExternalLink
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  linkedinUrl?: string;
  whatsappNumber?: string;
  role?: string;
  company?: string;
  relation?: string;
  notes?: string;
  source?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
  jobs?: Array<{
    id: string;
    company: string;
    role: string;
    status: string;
  }>;
}

const RELATIONS = [
  'RECRUITER',
  'HR',
  'HIRING_MANAGER',
  'ALUMNI',
  'SENIOR',
  'FRIEND',
  'COLLEAGUE',
  'REFERRAL',
  'COMPANY_EMPLOYEE',
  'DEVELOPER',
  'OTHER',
];

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRelation, setFilterRelation] = useState('');
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [relation, setRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  const fetchContacts = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterRelation) params.relation = filterRelation;
      
      const response = await api.get('/contacts', { params });
      setContacts(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, filterRelation]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setLinkedinUrl('');
    setWhatsappNumber('');
    setRole('');
    setCompany('');
    setRelation('');
    setNotes('');
    setSource('');
    setEditingContact(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhone(contact.phone || '');
    setEmail(contact.email || '');
    setLinkedinUrl(contact.linkedinUrl || '');
    setWhatsappNumber(contact.whatsappNumber || '');
    setRole(contact.role || '');
    setCompany(contact.company || '');
    setRelation(contact.relation || '');
    setNotes(contact.notes || '');
    setSource(contact.source || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        phone: phone || undefined,
        email: email || undefined,
        linkedinUrl: linkedinUrl || undefined,
        whatsappNumber: whatsappNumber || undefined,
        role: role || undefined,
        company: company || undefined,
        relation: relation || undefined,
        notes: notes || undefined,
        source: source || undefined,
      };

      if (editingContact) {
        await api.put(`/contacts/${editingContact.id}`, payload);
        toast.success('Contact updated');
      } else {
        await api.post('/contacts', payload);
        toast.success('Contact created');
      }

      setIsOpen(false);
      resetForm();
      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    
    try {
      await api.delete(`/contacts/${id}`);
      toast.success('Contact deleted');
      fetchContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const openWhatsApp = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  const formatRelation = (rel?: string) => {
    if (!rel) return '';
    return rel.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your professional network
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterRelation}
            onChange={(e) => setFilterRelation(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="">All Relations</option>
            {RELATIONS.map((rel) => (
              <option key={rel} value={rel}>
                {formatRelation(rel)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-6">
        {contacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No contacts found</p>
            <Button onClick={openCreateModal} className="mt-4">
              Add your first contact
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {contact.name}
                    </h3>
                    {contact.role && (
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.role}
                      </p>
                    )}
                    {contact.company && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" />
                        {contact.company}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-1.5 hover:bg-secondary rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>

                {contact.relation && (
                  <Badge variant="secondary" className="mb-3">
                    {formatRelation(contact.relation)}
                  </Badge>
                )}

                {/* Contact Actions */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      Email
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      Call
                    </a>
                  )}
                  {contact.whatsappNumber && (
                    <button
                      onClick={() => openWhatsApp(contact.whatsappNumber!)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </button>
                  )}
                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      LinkedIn
                    </a>
                  )}
                </div>

                {/* Linked Jobs */}
                {contact.jobs && contact.jobs.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      Linked Jobs: {contact.jobs.length}
                    </p>
                  </div>
                )}

                {contact.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {contact.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  WhatsApp Number
                </label>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  LinkedIn URL
                </label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Role
                </label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Company
                </label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Relation
                </label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Select relation</option>
                  {RELATIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {formatRelation(rel)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Source
                </label>
                <Input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="LinkedIn, College Event, etc."
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>{editingContact ? 'Update' : 'Create'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContactsPage;
