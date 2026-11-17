import { domMax } from "framer-motion";

// Split out so `LazyMotion` can load it after hydration. `domMax` because the
// highlights glide between rows with `layoutId`.
export default domMax;
