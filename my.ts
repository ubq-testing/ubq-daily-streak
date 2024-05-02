import { getStreaks } from "./src/streak-parts/entry";

(async () => {
  await getStreaks();
})().catch(console.error);
