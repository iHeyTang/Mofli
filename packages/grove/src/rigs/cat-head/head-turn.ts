import { softMaster, softQuarter, softSide } from "./soft-master.js";
/** Authored 2.5D turn: interpolate corresponding radial samples from the
 * approved front / three-quarter / side drawings. Negative yaw mirrors them.
 * These are view-dependent drawings, not a claim of a 3D reconstruction. */
export function turnedProfile(
  profile: number[],
  yaw: number,
  pitch: number,
  weight: number,
): number[] {
  const turn = Math.min(70, Math.abs(yaw));
  const k = turn <= 30 ? turn / 30 : (turn - 30) / 40;
  const from = turn <= 30 ? softMaster : softQuarter;
  const to = turn <= 30 ? softQuarter : softSide;
  return profile.map((r, i) => {
    const j = yaw < 0 ? (32 - i + 64) % 64 : i;
    const difference = from[j]! + (to[j]! - from[j]!) * k - softMaster[j]!;
    // Pitch gently compresses the crown in the same direction as the face.
    const upper = Math.max(0, -Math.sin((i * Math.PI) / 32));
    const pitchScale = 1 - (Math.min(30, Math.abs(pitch)) / 30) * 0.08 * upper;
    return Math.max(
      0.01,
      (r + difference * weight) * (1 + (pitchScale - 1) * weight),
    );
  });
}
