// Prueba rápida: node pruebas/probar.mjs contenido/datos
import { readFile } from 'node:fs/promises';
import { cargarJuego } from '../src/datos.js';
import { crearGuardado } from '../src/guardado.js';

const base = process.argv[2] || 'contenido/datos';
const fetchFn = async r => ({ ok: true, json: async () => JSON.parse(await readFile(r, 'utf8')) });
const juego = await cargarJuego(base, { fetchFn });
let fallos = 0;
for (const n of juego.niveles) {
  const hips = new Set(n.aprendiz.estrellas.map(e => e.hip));
  const sueltas = n.lineas.flat().filter(h => !hips.has(h));
  const fuera = [...n.tejedora.estrellas, n.tejedora.objeto].filter(p => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1);
  const ok = !sueltas.length && !fuera.length;
  if (!ok) fallos++;
  console.log(`${ok ? '✓' : '✗'} ${n.orden}. ${n.nombre}: ${hips.size} estrellas, ${n.lineas.length} hilos, objeto ${n.tejedora.objeto.id}`);
}
const mem = new Map();
const g = crearGuardado({ getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) });
g.completar('Lyr', 'aprendiz'); g.completar('Lyr', 'tejedora');
const g2 = crearGuardado({ getItem: k => mem.get(k) ?? null, setItem: () => {}, removeItem: () => {} });
const guardaOk = g2.estado('Lyr').tejedora && g2.atlas()[0] === 'Lyr';
console.log(`${guardaOk ? '✓' : '✗'} guardado: se recupera tras recargar`);
process.exit(fallos || !guardaOk ? 1 : 0);
