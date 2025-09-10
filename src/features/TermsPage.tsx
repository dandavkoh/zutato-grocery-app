import React from 'react';
import { useNavigate } from 'react-router-dom';
import FontAwesomeIcon from '../components/FontAwesomeIcon';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md p-6 sm:p-8 break-words">
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 text-sm"
          >
            <FontAwesomeIcon icon="fa-arrow-left" size="base" style="regular" />
            Zurück
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4 break-words">Nutzungsbedingungen</h1>
        <p className="text-gray-700 leading-relaxed break-words">
          Dies ist eine Platzhalterseite für die Nutzungsbedingungen. Ersetzen Sie diesen Text später durch Ihre
          tatsächlichen Inhalte.
        </p>
      </div>
    </div>
  );
};

export default TermsPage;
