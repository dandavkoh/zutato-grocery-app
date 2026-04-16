import React, { useEffect, useState } from 'react';
import { dexieService } from '../services/dexieService';
import type { DeadLetterQueueItem } from '../services/dexieService';
import FontAwesomeIcon from './FontAwesomeIcon';

interface DeadLetterQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component for viewing and managing failed requests in the dead letter queue
 * Allows users to:
 * - View all failed requests with error details
 * - Retry individual failed requests
 * - Delete permanently failed requests
 */
export const DeadLetterQueueModal: React.FC<DeadLetterQueueModalProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<DeadLetterQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const dlqItems = await dexieService.getDeadLetterQueue();
      setItems(dlqItems);
    } catch (error) {
      console.error('Failed to load dead letter queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await dexieService.retryFromDeadLetterQueue(id);
      await loadItems();
    } catch (error) {
      console.error('Failed to retry request:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese fehlgeschlagene Anfrage wirklich dauerhaft löschen?')) {
      return;
    }
    
    try {
      await dexieService.removeFromDeadLetterQueue(id);
      await loadItems();
    } catch (error) {
      console.error('Failed to delete request:', error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-blue-600 bg-blue-50';
      case 'POST': return 'text-green-600 bg-green-50';
      case 'PATCH': return 'text-yellow-600 bg-yellow-50';
      case 'PUT': return 'text-orange-600 bg-orange-50';
      case 'DELETE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Fehlgeschlagene Anfragen</h2>
              <p className="text-sm text-gray-500 mt-1">
                Anfragen, die nach maximalen Wiederholungsversuchen fehlgeschlagen sind
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <FontAwesomeIcon icon="fa-times" size="lg" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <FontAwesomeIcon icon="fa-spinner" className="text-gray-400 animate-spin" size="xl" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <FontAwesomeIcon icon="fa-check-circle" className="text-green-500 mb-4" size="3xl" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine fehlgeschlagenen Anfragen</h3>
                <p className="text-gray-500">Alle Anfragen wurden erfolgreich verarbeitet!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                  >
                    {/* Item summary */}
                    <div className="p-4 bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(item.method)}`}>
                              {item.method}
                            </span>
                            <span className="text-xs text-gray-500">
                              {item.retryCount} {item.retryCount === 1 ? 'Versuch' : 'Versuche'}
                            </span>
                          </div>
                          <p className="text-sm font-mono text-gray-900 truncate" title={item.endpoint}>
                            {item.endpoint}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimestamp(item.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                            aria-label={expandedItemId === item.id ? 'Details einklappen' : 'Details erweitern'}
                          >
                            <FontAwesomeIcon 
                              icon={expandedItemId === item.id ? 'fa-chevron-up' : 'fa-chevron-down'} 
                            />
                          </button>
                        </div>
                      </div>
                      
                      {/* Error message */}
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-start gap-2">
                          <FontAwesomeIcon icon="fa-exclamation-circle" className="text-red-500 mt-0.5" size="sm" />
                          <p className="text-sm text-red-800">{item.error}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedItemId === item.id && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        {/* Request body */}
                        {item.body && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Request Body:</h4>
                            <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                              {JSON.stringify(item.body, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Headers */}
                        {item.headers && Object.keys(item.headers).length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Headers:</h4>
                            <div className="text-xs bg-gray-50 p-3 rounded border border-gray-200">
                              {Object.entries(item.headers).map(([key, value]) => (
                                <div key={key} className="flex gap-2 mb-1">
                                  <span className="font-medium">{key}:</span>
                                  <span className="text-gray-600">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded hover:bg-red-100 transition-colors"
                          >
                            <FontAwesomeIcon icon="fa-trash" className="mr-2" />
                            Löschen
                          </button>
                          <button
                            onClick={() => handleRetry(item.id)}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                          >
                            <FontAwesomeIcon icon="fa-redo" className="mr-2" />
                            Erneut versuchen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'} in der Dead Letter Queue
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DeadLetterQueueModal;
