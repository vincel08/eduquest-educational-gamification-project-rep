import { Box, Button, Paper, Stack } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';

export { AnimatePresence, motion };

export const MotionBox = motion.create(Box);
export const MotionPaper = motion.create(Paper);
export const MotionStack = motion.create(Stack);
export const MotionButton = motion.create(Button);

/** New question / stage / card content swap */
export const roundSwap = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -14, scale: 0.98 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

/** Staggered multiple-choice entrance */
export const choiceListProps = {
  initial: 'hidden',
  animate: 'show',
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  },
};

export const choiceItemVariants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};

/** Grid / board tiles pop in */
export const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.82 },
  show: (index = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: Math.min(index * 0.03, 0.45), duration: 0.28, ease: 'easeOut' },
  }),
};

export const tapPress = { whileTap: { scale: 0.96 } };
export const hoverLift = { whileHover: { y: -2, scale: 1.02 } };
