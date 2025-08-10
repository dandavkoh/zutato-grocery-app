import React, { useState } from 'react';
import { InvitationController } from '../api/supabaseApi';
import FontAwesomeIcon from './FontAwesomeIcon';

interface InvitationRedeemProps {
  onSuccess?: () => void;
}

const InvitationRedeem: React.FC<InvitationRedeemProps> = ({ onSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    listName: string;
    listId: string;
  } | null>(null);
  
  const invitationController = new InvitationController();

  const handleRedeemCode = async () => {
    if (!invitationCode.trim()) {
      setError('Bitte gib einen Einladungscode ein');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await invitationController.redeemInvitationCode(invitationCode.trim());
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        if (response.data.success) {
          setSuccess({
            listName: response.data.list_name || 'Unbekannte Liste',
            listId: response.data.list_id || ''
          });
          setInvitationCode('');
          // Call onSuccess callback after a short delay
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            }
          }, 2000);
        } else {
          setError(response.data.message || 'Unbekannter Fehler');
        }
      }
    } catch (error) {
      console.error('Unexpected error redeeming invitation code:', error);
      setError('Unerwarteter Fehler beim Einlösen des Codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setInvitationCode('');
    setError(null);
    setSuccess(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleRedeemCode();
    }
  };

  return (
    <>
      {/* Button to open modal */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg mb-6 flex items-center justify-center text-lg gap-2"
      >
        <FontAwesomeIcon icon="fa-right-to-bracket" size="xl" style="regular"/>
        Einkaufsliste beitreten
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 text-lg font-semibold">Einkaufsliste beitreten</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon="fa-times" size="base" style="regular"/>
              </button>
            </div>

            {success ? (
              // Success state
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon="fa-check" size="xl" style="regular" className="text-white"/>
                </div>
                <h4 className="text-gray-900 text-lg font-semibold mb-2">Erfolgreich beigetreten!</h4>
                <p className="text-gray-600 mb-4">
                  Du bist jetzt Mitglied der Liste "{success.listName}"
                </p>
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Schließen
                </button>
              </div>
            ) : (
              // Input state
              <>
                <p className="text-gray-600 mb-4">
                  Gib den Einladungscode ein, den du erhalten hast:
                </p>
                
                <div className="mb-4">
                  <input
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    placeholder="Einladungscode eingeben"
                    className="w-full bg-gray-50 border border-gray-400 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 transition-colors font-mono text-center text-lg tracking-wider"
                    maxLength={12}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <div className="text-red-700 text-sm">{error}</div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-100 text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={loading}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleRedeemCode}
                    disabled={loading || !invitationCode.trim()}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <FontAwesomeIcon icon="fa-spinner" size="base" style="regular" className="animate-spin"/>
                        Prüfe...
                      </span>
                    ) : (
                      'Beitreten'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InvitationRedeem; 