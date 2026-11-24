import { RouteLocation } from '../model/ad';
import { optimizeStops, routeStats, validStops } from './ruta';
import { kgLabel, stateTab, toPickup, windowLabel } from './mappers';

// Cálculo local de la ruta (sin servicios externos) y conversiones de datos.
describe('ruta local', () => {
  const locs: RouteLocation[] = [
    { id: 'lejos', name: 'Lejos', detail: '', x: 90, y: 10, kg: 5 },
    { id: 'cerca', name: 'Cerca', detail: '', x: 15, y: 88, kg: 10 },
  ];

  it('validStops quita duplicados y paradas que no existen', () => {
    expect(validStops(locs, ['cerca', 'cerca', 'nada', 'lejos'])).toEqual(['cerca', 'lejos']);
  });

  it('routeStats suma kilos, distancia y minutos', () => {
    const s = routeStats(locs, ['cerca', 'lejos']);
    expect(s.stops.length).toBe(2);
    expect(s.kg).toBe('15 kg');
    expect(s.distance).toBeGreaterThan(0);
    expect(s.minutes).toBeGreaterThan(6);
  });

  it('optimizeStops ordena por cercanía y nunca alarga la ruta', () => {
    const ordenada = optimizeStops(locs, ['lejos', 'cerca']);
    expect(ordenada).toEqual(['cerca', 'lejos']);
    expect(routeStats(locs, ordenada).distance).toBeLessThanOrEqual(routeStats(locs, ['lejos', 'cerca']).distance);
  });
});

describe('mappers', () => {
  it('windowLabel muestra HOY / MAÑ / fecha corta', () => {
    const hoy = new Date(2030, 0, 10);
    expect(windowLabel('2030-01-10', 'tarde', hoy)).toBe('HOY 12:00–18:00');
    expect(windowLabel('2030-01-11', 'manana', hoy)).toBe('MAÑ 08:00–12:00');
    expect(windowLabel('2030-01-15', null, hoy)).toBe('15/01');
    expect(windowLabel(null, null, hoy)).toBe('Por coordinar');
  });

  it('toPickup traduce el estado del backend y arma la fila', () => {
    const row = toPickup({ id: 7, cantidad: 8.5, material: 'cartón', direccion: 'Av. X', estado: 'en_camino', prioritaria: true, contraparte: 'Ana', fechaCoordinada: null, publicacionId: 3, franjaHoraria: null, unidadMedida: 'kg' });
    expect(row.id).toBe('r7');
    expect(row.state).toBe('En camino');
    expect(row.kg).toBe(kgLabel(8.5, 'kg'));
    expect(stateTab(row.state)).toBe('activos');
  });
});
