import React, { useState, useEffect } from 'react';
import { X, UserPlus, Pencil } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api.client';

interface EditableContact {
  id: string;
  phoneNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Present => modal edits this contact instead of creating a new one.
  editContact?: EditableContact | null;
  onSaved?: () => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose, editContact, onSaved }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const isEditing = Boolean(editContact);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) return;
    setPhoneNumber(editContact?.phoneNumber || '');
    setFirstName(editContact?.firstName || '');
    setLastName(editContact?.lastName || '');
    setEmail(editContact?.email || '');
    setError('');
  }, [isOpen, editContact]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (isEditing && editContact) {
        const res = await apiClient.put(`/contacts/${editContact.id}`, {
          phoneNumber,
          firstName,
          lastName,
          email,
        });
        return res.data.data;
      }
      const res = await apiClient.post('/contacts', {
        phoneNumber,
        firstName,
        lastName,
        email,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setPhoneNumber('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setError('');
      onSaved?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || `Failed to ${isEditing ? 'update' : 'create'} contact`);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            {isEditing ? (
              <Pencil className="w-5 h-5 mr-2 text-emerald-400" />
            ) : (
              <UserPlus className="w-5 h-5 mr-2 text-emerald-400" />
            )}
            {isEditing ? 'Edit Contact' : 'Add New WhatsApp Contact'}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="contact-phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Phone Number (E.164 format with country code)
            </label>
            <input
              id="contact-phone"
              type="text"
              required
              placeholder="+919876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact-first-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                First Name
              </label>
              <input
                id="contact-first-name"
                type="text"
                placeholder="Rahul"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="contact-last-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Last Name
              </label>
              <input
                id="contact-last-name"
                type="text"
                placeholder="Sharma"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Email Address
            </label>
            <input
              id="contact-email"
              type="email"
              placeholder="rahul@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !phoneNumber}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
