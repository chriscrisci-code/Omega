export function turnToward(current, target, maxStep) {
  const error = wrapDelta(target - current, Math.PI * 2);
  if (Math.abs(error) <= maxStep) return target;
  return current + Math.sign(error) * maxStep;
}

export function wrapDelta(dx, size) {
  return dx - size * Math.round(dx / size);
}

export function damp(current, target, tau, dt) {
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

export function dampWrap(current, target, size, tau, dt) {
  return current + wrapDelta(target - current, size) * (1 - Math.exp(-dt / tau));
}

export function dampAngle(current, target, tau, dt) {
  return current + wrapDelta(target - current, Math.PI * 2) * (1 - Math.exp(-dt / tau));
}

export function wrapCoord(x, size) {
  return ((x % size) + size) % size;
}

export function wrap(entity, width, height) {
  entity.x = wrapCoord(entity.x, width);
  entity.y = wrapCoord(entity.y, height);
}

export function hits(a, b, width, height) {
  const dx = width ? wrapDelta(a.x - b.x, width) : a.x - b.x;
  const dy = height ? wrapDelta(a.y - b.y, height) : a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

export function hitsBeam(shot, rock, length) {
  const nx = Math.cos(shot.angle);
  const ny = Math.sin(shot.angle);
  const rx = rock.x - shot.x;
  const ry = rock.y - shot.y;
  const along = -(rx * nx + ry * ny);
  const t = Math.max(0, Math.min(length, along));
  const px = -nx * t;
  const py = -ny * t;
  const dx = rx - px;
  const dy = ry - py;
  const r = rock.radius + (shot.radius || 3);
  return dx * dx + dy * dy < r * r;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function pick(list) {
  return list[(Math.random() * list.length) | 0];
}

export function edgePoint(width, height, pad = 40) {
  const side = (Math.random() * 4) | 0;
  if (side === 0) return { x: rand(-pad, width + pad), y: -pad };
  if (side === 1) return { x: rand(-pad, width + pad), y: height + pad };
  if (side === 2) return { x: -pad, y: rand(-pad, height + pad) };
  return { x: width + pad, y: rand(-pad, height + pad) };
}
