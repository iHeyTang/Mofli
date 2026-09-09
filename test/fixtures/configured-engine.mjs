import { PetEngine as Engine } from "@mofli/core";
// Converts historical regression fixtures, not a production compatibility API.
function split(rig, value, prior) {
  const { parameters = {}, ...skin } = value;
  const rigConfig = { ...skin.rigConfig, ...(prior?.rigConfig ?? {}) },
    pose = { ...(prior?.pose ?? {}) };
  for (const [k, v] of Object.entries(parameters)) {
    if (Object.hasOwn(rig.poseParameters ?? {}, k)) pose[k] = v;
    else rigConfig[k] = v;
  }
  return { skin, rigConfig, pose };
}
export class FixtureEngine extends Engine {
  constructor(rig, value, options = {}) {
    const c = split(rig, value);
    super(rig, c.skin, { ...options, rigConfig: c.rigConfig, pose: c.pose });
  }
  setSkin(value, time, options) {
    super.setCharacter(split(this.rig, value), time, options);
  }
}
