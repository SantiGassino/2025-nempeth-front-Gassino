import { useState, useEffect, useCallback } from 'react';
import { reservationService, type GanttTableData, type GanttReservation, type ReservationStatus } from '../services/reservationService';

interface GanttModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  initialDate?: Date;
}

// Colores según estado de reserva
const STATUS_COLORS: Record<ReservationStatus, { bg: string; border: string; text: string }> = {
  PENDING: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
  IN_PROGRESS: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
  COMPLETED: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-600' },
  CANCELLED: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' },
  NO_SHOW: { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
};

const GanttModal = ({ isOpen, onClose, businessId, initialDate = new Date() }: GanttModalProps) => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [ganttData, setGanttData] = useState<GanttTableData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del Gantt
  const loadGanttData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Formatear fecha a YYYY-MM-DD
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const data = await reservationService.getGanttData(businessId, dateStr);

      // Ordenar mesas alfabéticamente por tableCode
      const sortedData = [...data].sort((a, b) => 
        a.tableCode.localeCompare(b.tableCode, undefined, { numeric: true, sensitivity: 'base' })
      );

      setGanttData(sortedData);
    } catch (err) {
      setError('Error al cargar datos del diagrama');
      console.error('Error loading gantt data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, currentDate]);

  // Formatear fecha para mostrar
  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calcular posición y ancho de una reserva en el Gantt
  const calculateReservationPosition = (reservation: GanttReservation) => {
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const resStart = new Date(reservation.startDateTime);
    const resEnd = new Date(reservation.endDateTime);

    // Si la reserva empieza antes del día actual, cortarla al inicio del día
    const effectiveStart = resStart < startOfDay ? startOfDay : resStart;
    
    // Si la reserva termina después del día actual, cortarla al final del día
    const effectiveEnd = resEnd > endOfDay ? endOfDay : resEnd;

    // Calcular minutos desde el inicio del día
    const minutesFromStart = (effectiveStart.getTime() - startOfDay.getTime()) / (1000 * 60);
    const duration = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60);

    // Cada intervalo de 15 min = 1 unidad en el grid (96 unidades en 24h)
    // 1 unidad = 100% / 96 = 1.0416666%
    const left = (minutesFromStart / 15) * (100 / 96);
    const width = (duration / 15) * (100 / 96);

    return { left: `${left}%`, width: `${width}%` };
  };

  // Detectar solapamientos y asignar carriles (lanes) a las reservas
  const calculateLanes = (reservations: GanttReservation[]) => {
    // Ordenar reservas por hora de inicio
    const sorted = [...reservations].sort(
      (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );

    const lanes: Array<{ reservation: GanttReservation; lane: number }> = [];
    const laneEndTimes: number[] = [];

    sorted.forEach((reservation) => {
      const startTime = new Date(reservation.startDateTime).getTime();
      const endTime = new Date(reservation.endDateTime).getTime();

      // Buscar un carril disponible (donde la reserva anterior ya haya terminado)
      let assignedLane = -1;
      for (let i = 0; i < laneEndTimes.length; i++) {
        if (laneEndTimes[i] <= startTime) {
          assignedLane = i;
          laneEndTimes[i] = endTime;
          break;
        }
      }

      // Si no hay carril disponible, crear uno nuevo
      if (assignedLane === -1) {
        assignedLane = laneEndTimes.length;
        laneEndTimes.push(endTime);
      }

      lanes.push({ reservation, lane: assignedLane });
    });

    return { lanes, totalLanes: laneEndTimes.length };
  };

  // Calcular posición y ancho del buffer de 45 minutos antes de la reserva
  const calculateBufferPosition = (reservation: GanttReservation) => {
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const resStart = new Date(reservation.startDateTime);
    
    // Buffer de 45 minutos antes del inicio
    const bufferStart = new Date(resStart.getTime() - 45 * 60 * 1000);
    
    // Si el buffer empieza antes del día actual, cortarlo
    const effectiveBufferStart = bufferStart < startOfDay ? startOfDay : bufferStart;
    const effectiveBufferEnd = resStart < startOfDay ? startOfDay : (resStart > endOfDay ? endOfDay : resStart);
    
    // Si el buffer está completamente fuera del día, no mostrarlo
    if (effectiveBufferStart >= endOfDay || effectiveBufferEnd <= startOfDay) {
      return null;
    }

    const minutesFromStart = (effectiveBufferStart.getTime() - startOfDay.getTime()) / (1000 * 60);
    const duration = (effectiveBufferEnd.getTime() - effectiveBufferStart.getTime()) / (1000 * 60);

    const left = (minutesFromStart / 15) * (100 / 96);
    const width = (duration / 15) * (100 / 96);

    return { left: `${left}%`, width: `${width}%` };
  };

  // Navegar entre días
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Cargar datos cuando cambia la fecha
  useEffect(() => {
    if (isOpen) {
      loadGanttData();
    }
  }, [isOpen, loadGanttData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              📊 Diagrama de Gantt - Ocupación de Mesas
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navegación de fechas */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToPreviousDay}
              disabled={isLoading}
              className="px-4 py-2 font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              ← Día Anterior
            </button>

            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-700 capitalize">
                {formatDisplayDate(currentDate)}
              </span>
              <button
                onClick={goToToday}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-[#f74116] hover:bg-[#d63813] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Hoy
              </button>
              <input
                type="date"
                value={currentDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value + 'T12:00:00');
                  if (!isNaN(newDate.getTime())) {
                    setCurrentDate(newDate);
                  }
                }}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f74116] focus:border-transparent disabled:opacity-50 cursor-pointer"
                title="Seleccionar fecha específica"
              />
            </div>

            <button
              onClick={goToNextDay}
              disabled={isLoading}
              className="px-4 py-2 font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Día Siguiente →
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="mb-4 text-lg text-red-600">❌ {error}</p>
                <button
                  onClick={loadGanttData}
                  className="px-4 py-2 bg-[#f74116] hover:bg-[#d63813] text-white rounded-lg font-medium transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : ganttData.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-lg text-gray-500">No hay mesas disponibles</p>
            </div>
          ) : (
            <div className="relative h-full overflow-auto">
              {/* Spinner de carga inline */}
              {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white bg-opacity-75">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[#f74116] rounded-full animate-spin"></div>
                    <p className="font-medium text-gray-600">Cargando ocupación...</p>
                  </div>
                </div>
              )}
              {/* Gantt Chart */}
              <div>
                {/* Timeline header - Cada hora */}
                <div className="sticky top-0 z-10 flex mb-2 bg-white border-b-2 border-gray-300">
                  <div className="flex-shrink-0 w-24"></div>
                  <div className="flex flex-1">
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div
                        key={hour}
                        className="flex-1 pb-2 text-xs font-semibold text-center text-gray-600 border-l border-gray-300"
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mesas y sus reservas */}
                {ganttData.map((table) => {
                  // Calcular carriles para esta mesa
                  const { lanes, totalLanes } = calculateLanes(table.reservations);
                  // Altura dinámica: mínimo 40px, o 32px por carril si hay solapamientos
                  const rowHeight = totalLanes > 1 ? Math.max(40, totalLanes * 32) : 40;

                  return (
                    <div key={table.tableId} className="flex items-center mb-1 hover:bg-gray-50">
                      {/* Columna de mesa */}
                      <div className="flex-shrink-0 w-24 py-2 pr-2">
                        <div className="text-sm font-semibold text-gray-800">{table.tableCode}</div>
                        <div className="text-[10px] text-gray-500">Cap: {table.capacity}p</div>
                      </div>

                      {/* Timeline con grid de 15 minutos */}
                      <div 
                        className="relative flex-1 border border-gray-200 bg-gray-50"
                        style={{ height: `${rowHeight}px` }}
                      >
                        {/* Grid lines cada hora */}
                        {Array.from({ length: 24 }, (_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-l border-gray-300"
                            style={{ left: `${(i / 24) * 100}%` }}
                          />
                        ))}

                        {/* Reservas con carriles */}
                        {lanes.map(({ reservation, lane }) => {
                          const position = calculateReservationPosition(reservation);
                          const bufferPosition = calculateBufferPosition(reservation);
                          const colors = STATUS_COLORS[reservation.status];

                          // Calcular altura y posición vertical del carril
                          const laneHeight = Math.floor(rowHeight / totalLanes);
                          const topOffset = lane * laneHeight;

                          return (
                            <div key={reservation.reservationId}>
                              {/* Buffer de 45 minutos (preparación) */}
                              {bufferPosition && (
                                <div
                                  className="absolute bg-yellow-100 border-l-2 border-yellow-400 opacity-70"
                                  style={{
                                    left: bufferPosition.left,
                                    width: bufferPosition.width,
                                    top: `${topOffset + 2}px`,
                                    height: `${laneHeight - 4}px`,
                                    minWidth: '10px',
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(251, 191, 36, 0.3) 4px, rgba(251, 191, 36, 0.3) 8px)',
                                  }}
                                  title="Tiempo de preparación (45 min) - Mesa bloqueada"
                                />
                              )}
                              
                              {/* Reserva principal */}
                              <div
                                className={`absolute ${colors.bg} ${colors.border} border-l-4 rounded-r px-1.5 py-0.5 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow z-10`}
                                style={{
                                  left: position.left,
                                  width: position.width,
                                  top: `${topOffset + 2}px`,
                                  height: `${laneHeight - 4}px`,
                                  minWidth: '15px',
                                }}
                                title={`${reservation.customerName} - ${reservation.partySize}p\n${new Date(reservation.startDateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(reservation.endDateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\nEstado: ${reservation.status}`}
                              >
                                <div className={`text-[10px] font-semibold ${colors.text} truncate`}>
                                  {reservation.customerName}
                                </div>
                                <div className={`text-[9px] ${colors.text} truncate`}>
                                  {reservation.partySize}p
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leyenda */}
              <div className="pt-4 mt-6 border-t border-gray-200">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Leyenda:</h3>
                <div className="flex flex-wrap gap-4">
                  {/* Buffer de preparación */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-4 bg-yellow-100 border-l-2 border-yellow-400 opacity-70"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(251, 191, 36, 0.3) 4px, rgba(251, 191, 36, 0.3) 8px)',
                      }}
                    />
                    <span className="text-xs text-gray-600">Tiempo de preparación (45 min antes)</span>
                  </div>
                  
                  {/* Estados de reserva */}
                  {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                    <div key={status} className="flex items-center gap-2">
                      <div className={`w-8 h-4 ${colors.bg} ${colors.border} border-l-4 rounded-r`} />
                      <span className="text-xs text-gray-600">
                        {status === 'PENDING' && 'Pendiente'}
                        {status === 'IN_PROGRESS' && 'En Curso'}
                        {status === 'COMPLETED' && 'Completada'}
                        {status === 'CANCELLED' && 'Cancelada'}
                        {status === 'NO_SHOW' && 'Ausente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista de reservas */}
              <div className="pt-4 mt-6 border-t border-gray-200">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Reservas del día:</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {ganttData
                    .flatMap(table => 
                      table.reservations.map(reservation => ({
                        ...reservation,
                        tableCode: table.tableCode
                      }))
                    )
                    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
                    .map((reservation, index) => {
                      const colors = STATUS_COLORS[reservation.status];
                      const startTime = new Date(reservation.startDateTime).toLocaleTimeString('es-AR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      const endTime = new Date(reservation.endDateTime).toLocaleTimeString('es-AR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });

                      return (
                        <div 
                          key={`${reservation.reservationId}-${index}`}
                          className={`p-3 ${colors.bg} border ${colors.border} border-l-4 rounded-r-lg hover:shadow-md transition-shadow`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-bold ${colors.text} truncate`}>
                                {reservation.customerName}
                              </h4>
                            </div>
                            <span className={`ml-2 px-2 py-0.5 text-[10px] font-semibold ${colors.bg} ${colors.text} border ${colors.border} rounded-full flex-shrink-0`}>
                              {reservation.status === 'PENDING' && 'Pendiente'}
                              {reservation.status === 'IN_PROGRESS' && 'En Curso'}
                              {reservation.status === 'COMPLETED' && 'Completada'}
                              {reservation.status === 'CANCELLED' && 'Cancelada'}
                              {reservation.status === 'NO_SHOW' && 'Ausente'}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-700">
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">{startTime}</span>
                              <span className="text-gray-400">-</span>
                              <span className="font-medium">{endTime}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="font-medium">{reservation.partySize} {reservation.partySize === 1 ? 'persona' : 'personas'}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium text-gray-700">{reservation.tableCode}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {ganttData.every(table => table.reservations.length === 0) && (
                  <p className="py-8 text-sm text-center text-gray-500">
                    No hay reservas para este día
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GanttModal;
