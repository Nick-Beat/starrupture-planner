import React, { useState, useEffect } from 'react';
import { dispatch, useSubscription } from '@flexsurfer/reflex';
import { SUB_IDS } from '../state/sub-ids';
import { EVENT_IDS } from '../state/event-ids';
import type { BaseStorageBuildingWithBase } from './types';
import { SelectItemModal } from './mybases/modals';
import type { Base } from '../../state/db';

interface StorageSectionProps {
  baseName: string;
  baseId: string;
  storageBuildings: BaseStorageBuildingWithBase[];
  totalHeat: number;
  totalPower: number;
}

const StorageSection: React.FC<StorageSectionProps> = ({ baseName, baseId, storageBuildings, totalHeat, totalPower }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleRemove = (baseBuildingId: string) => {
    dispatch([EVENT_IDS.BASES_REMOVE_BUILDING, baseBuildingId]);
  };

  const [selectModalState, setSelectModalState] = useState<{
    isOpen: boolean;
    baseStorage: BaseStorageBuildingWithBase | null;
  }>({ isOpen: false, baseStorage: null });

  const handleOpenSelectModal = (baseStorage: BaseStorageBuildingWithBase) => {
    setSelectModalState({ isOpen: true, baseStorage });
  };

  const handleCloseModal = () => {
    setSelectModalState({ isOpen: false, baseStorage: null });
  };

  const handleConfirmItem = (itemId: string, ratePerMinute: number) => {
    if (!selectModalState.baseStorage) return;
    dispatch([
      EVENT_IDS.BASES_UPDATE_BUILDING_ITEM_SELECTION,
      baseId,
      selectModalState.baseStorage.baseBuildingId,
      itemId,
      ratePerMinute,
    ]);
    handleCloseModal();
  };

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300">
      <div className="card-body">
        <div
          className="flex items-center gap-4 mb-4 cursor-pointer hover:bg-base-200 -mx-4 -mt-4 px-4 pt-4 pb-4 rounded-t-lg transition-colors sticky top-0 z-10 bg-base-100"
          onClick={toggleCollapse}
        >
          <div className="flex-1">
            <h2 className="card-title text-xl">{baseName}</h2>
            <div className="flex gap-2 flex-wrap items-center mt-3">
              <div className="badge badge-outline">
                {storageBuildings.length} building{storageBuildings.length !== 1 ? 's' : ''}
              </div>
              {totalHeat > 0 && (
                <>
                  <span className="text-xs text-base-content/40">|</span>
                  <span className="text-sm">🔥 {totalHeat}</span>
                </>
              )}
              {totalPower > 0 && (
                <>
                  <span className="text-xs text-base-content/40">|</span>
                  <span className="text-sm">⚡ {totalPower} MW</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <svg
              className={`w-6 h-6 text-base-content transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {!isCollapsed && (
          <>
            {storageBuildings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-base-content/70">No storage buildings in this base</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {storageBuildings.map((storage) => (
                  <StorageBuildingCard
                    key={storage.baseBuildingId}
                    storage={storage}
                    onRemove={handleRemove}
                    onOpenSelectModal={handleOpenSelectModal}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectModalState.isOpen && selectModalState.baseStorage && (
        <SelectItemModal
          isOpen={selectModalState.isOpen}
          building={selectModalState.baseStorage.building}
          currentItemId={selectModalState.baseStorage.selectedItemId}
          onClose={handleCloseModal}
          onConfirm={handleConfirmItem}
        />
      )}
    </div>
  );
};

interface StorageBuildingCardProps {
  storage: BaseStorageBuildingWithBase;
  onRemove: (baseBuildingId: string) => void;
  onOpenSelectModal: (storage: BaseStorageBuildingWithBase) => void;
}

const StorageBuildingCard: React.FC<StorageBuildingCardProps> = ({ storage, onRemove, onOpenSelectModal }) => {
  const itemsMap = useSubscription<Record<string, Item>>([SUB_IDS.ITEMS_BY_ID_MAP]);
  const selectedItem = storage.selectedItemId ? itemsMap[storage.selectedItemId] : null;
  
  const buildingImage = '/icons/buildings/' + storage.building.id + '.webp';
  const itemImage = selectedItem ? '/icons/items/' + selectedItem.id + '.webp' : null;

  const totalHeat = (storage.building.heat || 0);
  const totalPower = (storage.building.power || 0);

  return (
    <>
      <div className="card bg-base-200 shadow-md border border-base-300">
        <div className="card-body p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold min-w-0 truncate" title={storage.name}>
                {storage.name}
              </div>
            </div>

            <div className="flex flex-row flex-1 justify-between gap-2">
              <div className="flex flex-col items-center gap-2">
                <img
                  src={buildingImage}
                  alt={storage.building.name}
                  className="w-20 h-20 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              {(storage.selectedItemId) ? (
                <button
                  onClick={() => onOpenSelectModal(storage)}
                  className="flex-shrink-0 w-20 min-h-20 border-2 border-dashed border-base-300 hover:border-primary rounded-lg flex flex-col items-center justify-center gap-1 transition-colors bg-base-100 px-1"
                >
                  {itemImage && (
                    <>
                      <img
                        src={itemImage}
                        alt={selectedItem?.name}
                        className="w-8 h-8"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </>
                  )}
                  <span className="text-xs text-center">{selectedItem?.name || 'Select'}</span>
                  {storage.storedOutput !== undefined && storage.storedOutput !== null && (
                    <span className="text-xs text-center">Out: {storage.storedOutput}</span>
                  )}
                  {storage.storedInput !== undefined && storage.storedInput !== null && (
                    <span className="text-xs text-center">In: {storage.storedInput}</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => onOpenSelectModal(storage)}
                  className="flex-shrink-0 w-20 min-h-20 border-2 border-dashed border-base-300 hover:border-primary rounded-lg flex flex-col items-center justify-center gap-1 transition-colors bg-base-100 px-1"
                >
                  <svg
                    className="w-6 h-6 text-base-content/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-row">
              <div className="text-xs flex flex-row gap-1 items-center ml-5" >
                <span>⚡</span>
                <span>{totalPower}</span>
                <span>🔥</span>
                <span>{totalHeat}</span>
              </div>

              <div className="flex-1 flex items-end justify-end mt-auto">
                <button
                  className="btn btn-xs btn-error btn-outline"
                  onClick={() => onRemove(storage.baseBuildingId)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const STORAGE_UPDATE_INTERVAL_MS = 60 * 1000; // Update building data every minute

const StoragePage: React.FC = () => {
  const bases = useSubscription<Base[]>([SUB_IDS.BASES_LIST]);
  const storageBuildings = useSubscription<BaseStorageBuildingWithBase[]>([SUB_IDS.BASES_STORAGE_AGREGATED]);

  // Timer to periodically update building data
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch([EVENT_IDS.STORAGE_PAGE_UPDATE_BUILDING_DATA]);
    }, STORAGE_UPDATE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  if (!bases || bases.length === 0) {
    return (
      <div className="h-full p-4 lg:p-6">
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
            <h1 className="text-2xl lg:text-3xl font-bold">Storage Overview</h1>
          </div>
          <div className="text-center py-8">
            <div className="text-base-content/60">No bases yet. Create a base in My Bases to manage storage.</div>
          </div>
        </div>
      </div>
    );
  }

  const totalStorageCount = storageBuildings.length;

  return (
    <div className="h-full p-4 lg:p-6">
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          <h1 className="text-2xl lg:text-3xl font-bold">Storage</h1>
          <div className="stats shadow stats-horizontal">
            <div className="stat">
              <div className="stat-title text-xs sm:text-sm">Total Bases</div>
              <div className="stat-value text-lg sm:text-2xl">{bases.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-xs sm:text-sm">Storage Buildings</div>
              <div className="stat-value text-lg sm:text-2xl">{totalStorageCount}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:gap-6">
          {bases.map((base) => {
            const baseStorageBuildings = storageBuildings.filter(s => s.baseId === base.id);
            
            let totalHeat = 0;
            let totalPower = 0;
            baseStorageBuildings.forEach((s) => {
              totalHeat += s.building.heat || 0;
              totalPower += s.building.power || 0;
            });

            return (
              <StorageSection
                key={base.id}
                baseName={base.name}
                baseId={base.id}
                storageBuildings={baseStorageBuildings}
                totalHeat={totalHeat}
                totalPower={totalPower}
              />
            );
          })}
        </div>

        {totalStorageCount === 0 && (
          <div className="text-center py-8">
            <div className="text-base-content/60">No storage buildings in any bases. Add storage buildings in My Bases.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoragePage;
