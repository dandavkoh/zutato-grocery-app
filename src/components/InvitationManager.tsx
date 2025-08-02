import React, { useState, useEffect } from 'react';
import { InvitationController, type ListInvitationWithStatus } from '../api/supabaseApi';
import FontAwesomeIcon from './FontAwesomeIcon';

interface InvitationManagerProps {
  listId: string;
}

const InvitationManager: React.FC<InvitationManagerProps> = ({ listId }) => {
  const [invitations, setInvitations] = useState<ListInvitationWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newInvitation, setNewInvitation] = useState<{
    invitation_code: string;
    expires_at: string;
  } | null>(null);
  const [showNewInvitation, setShowNewInvitation] = useState(false);
  
  const invitationController = new InvitationController();

  // Load invitations
  const loadInvitations = async () => {
    setLoading(true);
    try {
      const response = await invitationController.getListInvitations(listId);
      if (response.error) {
        console.error('Failed to load invitations:', response.error);
        alert('Fehler beim Laden der Einladungen: ' + response.error);
      } else {
        setInvitations(response.data || []);
      }
    } catch (error) {
      console.error('Unexpected error loading invitations:', error);
      alert('Unerwarteter Fehler beim Laden der Einladungen');
    } finally {
      setLoading(false);
    }
  };

  // Create new invitation
  const handleCreateInvitation = async () => {
    setCreating(true);
    try {
      const response = await invitationController.createInvitation(listId);
      if (response.error) {
        console.error('Failed to create invitation:', response.error);
        alert('Fehler beim Erstellen der Einladung: ' + response.error);
      } else if (response.data) {
        setNewInvitation(response.data);
        setShowNewInvitation(true);
        await loadInvitations(); // Reload to show new invitation
      }
    } catch (error) {
      console.error('Unexpected error creating invitation:', error);
      alert('Unerwarteter Fehler beim Erstellen der Einladung');
    } finally {
      setCreating(false);
    }
  };

  // Invalidate invitation
  const handleInvalidateInvitation = async (invitationId: string) => {
    if (!confirm('Möchtest du diese Einladung wirklich ungültig machen?')) {
      return;
    }

    try {
      const response = await invitationController.invalidateInvitation(invitationId);
      if (response.error) {
        console.error('Failed to invalidate invitation:', response.error);
        alert('Fehler beim Ungültig machen der Einladung: ' + response.error);
      } else {
        await loadInvitations(); // Reload to show updated status
      }
    } catch (error) {
      console.error('Unexpected error invalidating invitation:', error);
      alert('Unerwarteter Fehler beim Ungültig machen der Einladung');
    }
  };

  // Delete invitation
  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Möchtest du diese Einladung wirklich löschen?')) {
      return;
    }

    try {
      const response = await invitationController.deleteInvitation(invitationId);
      if (response.error) {
        console.error('Failed to delete invitation:', response.error);
        alert('Fehler beim Löschen der Einladung: ' + response.error);
      } else {
        await loadInvitations(); // Reload to show updated list
      }
    } catch (error) {
      console.error('Unexpected error deleting invitation:', error);
      alert('Unerwarteter Fehler beim Löschen der Einladung');
    }
  };

  // Copy invitation code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      alert('Einladungscode in die Zwischenablage kopiert!');
    }).catch(() => {
      alert('Fehler beim Kopieren des Codes');
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'used': return 'text-blue-400';
      case 'expired': return 'text-yellow-400';
      case 'invalidated': return 'text-red-400';
      case 'deleted': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'used': return 'Verwendet';
      case 'expired': return 'Abgelaufen';
      case 'invalidated': return 'Ungültig';
      case 'deleted': return 'Gelöscht';
      default: return 'Unbekannt';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    loadInvitations();
  }, [listId]);

  return (
    <div className="mb-8">
      <label className="block text-white text-sm font-medium mb-3 uppercase tracking-wide">
        EINLADUNGEN VERWALTEN
      </label>
      
      {/* Create new invitation button */}
      <button
        onClick={handleCreateInvitation}
        disabled={creating}
        className="w-full bg-neutral-900 border border-yellow-400 text-white font-semibold py-3 rounded-2xl hover:bg-yellow-400 hover:text-black transition-colors mb-4 disabled:opacity-50"
      >
        {creating ? (
          <span className="flex items-center justify-center gap-2">
            <FontAwesomeIcon icon="fa-spinner" size="base" style="regular" className="animate-spin"/>
            Erstelle Einladung...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <FontAwesomeIcon icon="fa-plus" size="base" style="regular"/>
            Neue Einladung erstellen
          </span>
        )}
      </button>

      {/* New invitation modal */}
      {showNewInvitation && newInvitation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-white text-lg font-semibold mb-4">Neue Einladung erstellt!</h3>
            
            <div className="bg-neutral-800 rounded-xl p-4 mb-4">
              <div className="text-gray-400 text-sm mb-2">Einladungscode:</div>
              <div className="text-white font-mono text-lg mb-2 break-all">
                {newInvitation.invitation_code}
              </div>
              <button
                onClick={() => copyToClipboard(newInvitation.invitation_code)}
                className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1"
              >
                <FontAwesomeIcon icon="fa-copy" size="base" style="regular"/>
                In Zwischenablage kopieren
              </button>
            </div>
            
            <div className="text-gray-400 text-sm mb-4">
              <div>Gültig bis: {formatDate(newInvitation.expires_at)}</div>
              <div className="mt-1">Teile diesen Code mit der Person, die du einladen möchtest.</div>
            </div>
            
            <button
              onClick={() => {
                setShowNewInvitation(false);
                setNewInvitation(null);
              }}
              className="w-full bg-yellow-400 text-black font-semibold py-3 rounded-xl hover:bg-yellow-500 transition-colors"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Invitations list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-4">
            <div className="text-white">Lade Einladungen...</div>
          </div>
        ) : invitations.length > 0 ? (
          invitations.map((invitation) => (
            <div key={invitation.id} className="bg-neutral-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon="fa-ticket" size="base" style="regular" className="text-black"/>
                  </div>
                  <div>
                    <div className="text-white font-mono text-sm">{invitation.invitation_code}</div>
                    <div className={`text-xs ${getStatusColor(invitation.status)}`}>
                      {getStatusText(invitation.status)}
                    </div>
                  </div>
                </div>
                
                {/* Action buttons */}
                {invitation.status === 'active' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(invitation.invitation_code)}
                      className="text-yellow-400 hover:text-yellow-300 p-2"
                      title="Code kopieren"
                    >
                      <FontAwesomeIcon icon="fa-copy" size="base" style="regular"/>
                    </button>
                    <button
                      onClick={() => handleInvalidateInvitation(invitation.id)}
                      className="text-red-400 hover:text-red-300 p-2"
                      title="Ungültig machen"
                    >
                      <FontAwesomeIcon icon="fa-ban" size="base" style="regular"/>
                    </button>
                    <button
                      onClick={() => handleDeleteInvitation(invitation.id)}
                      className="text-gray-400 hover:text-red-400 p-2"
                      title="Löschen"
                    >
                      <FontAwesomeIcon icon="fa-trash" size="base" style="regular"/>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="text-gray-400 text-xs">
                <div>Erstellt: {formatDate(invitation.created_at)}</div>
                <div>Gültig bis: {formatDate(invitation.expires_at)}</div>
                {invitation.used_at && (
                  <div>Verwendet: {formatDate(invitation.used_at)}</div>
                )}
                {invitation.invalidated_at && (
                  <div>Ungültig gemacht: {formatDate(invitation.invalidated_at)}</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <div className="text-gray-400">Keine Einladungen vorhanden</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationManager; 