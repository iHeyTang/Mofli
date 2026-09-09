/** Ear height and base width share one proportional control. The body remains
 * unchanged; only the ear increments are resampled around their two peaks. */
export function buildEarProfile(master: number[], body: number[], length: number, cheek: number): number[] {
  const ratio = length / 45;
  const width = Math.max(.78, Math.min(1.4, Math.sqrt(ratio)));
  const delta = (i: number) => Math.max(0, master[i]! - body[i]!);
  return master.map((r, i) => {
    // Preserve the approved default master exactly, including its tiny seam corrections.
    if (length === 45) return (body[i]! + ((r-body[i]!)*length)/45)*(1+cheek*.025*Math.cos(i*Math.PI/16));
    const center = i >= 33 && i < 48 ? 41 : i >= 48 && i <= 63 ? 55 : null;
    let ear = 0;
    if (center !== null) {
      const source = center + (i-center)/width;
      if (source >= 33 && source <= 63) {
        const a=Math.floor(source), t=source-a;
        ear=(delta(a)*(1-t)+delta(Math.min(63,a+1))*t)*ratio;
      }
    }
    // Keep non-ear details at the original master value, rather than scaling the whole head.
    const base = i >= 33 && i <= 63 ? body[i]! : r;
    return (base+ear)*(1+cheek*.025*Math.cos(i*Math.PI/16));
  });
}
