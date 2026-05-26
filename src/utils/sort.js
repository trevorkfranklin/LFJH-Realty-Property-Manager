// Strip leading house number so "21226 Highland Knolls Dr" sorts as "Highland Knolls Dr"
function streetKey(p) {
  const m = (p.name || '').match(/^(\d+)\s+(.+)$/);
  return m ? [m[2].toLowerCase(), parseInt(m[1])] : [(p.name || '').toLowerCase(), 0];
}

export function sortByStreetName(arr) {
  return [...arr].sort((a, b) => {
    const [as, an] = streetKey(a);
    const [bs, bn] = streetKey(b);
    return as.localeCompare(bs) || an - bn;
  });
}

export function sortByLeaseEnd(arr) {
  return [...arr].sort((a, b) => {
    if (!a.leaseEnd && !b.leaseEnd) return 0;
    if (!a.leaseEnd) return 1;
    if (!b.leaseEnd) return -1;
    return a.leaseEnd.localeCompare(b.leaseEnd);
  });
}
