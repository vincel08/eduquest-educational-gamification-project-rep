import { Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import logoFull from '../../assets/eduwow-logo.png';
import logoMark from '../../assets/eduwow-mark.svg';

const SIZE_MAP = {
  compact: {
    height: { xs: 32, sm: 36 },
    maxWidth: { xs: 32, sm: 36 },
    src: logoMark,
    square: true,
  },
  sidebar: {
    height: { xs: 64, sm: 80 },
    maxWidth: { xs: 148, sm: 180 },
    src: logoFull,
  },
  auth: {
    height: { xs: 96, sm: 132 },
    maxWidth: { xs: 200, sm: 260 },
    src: logoFull,
  },
  hero: {
    height: { xs: 112, sm: 160, md: 180 },
    maxWidth: { xs: 200, sm: 300, md: 360 },
    src: logoFull,
  },
};

/**
 * EduWow system logo (transparent PNG — works on light and dark chrome).
 * @param {'compact'|'sidebar'|'auth'|'hero'} [size='sidebar']
 * @param {string|null} [to]
 */
export default function BrandLogo({
  size = 'sidebar',
  to = null,
  alt = 'EduWow',
  sx = {},
}) {
  const dims = SIZE_MAP[size] || SIZE_MAP.sidebar;

  const image = (
    <Box
      component="img"
      src={dims.src}
      alt={alt}
      sx={{
        height: dims.height,
        width: dims.square ? dims.height : 'auto',
        maxWidth: dims.maxWidth,
        objectFit: 'contain',
        display: 'block',
        userSelect: 'none',
        backgroundColor: 'transparent',
        ...sx,
      }}
    />
  );

  if (!to) return image;

  return (
    <Box
      component={RouterLink}
      to={to}
      aria-label="EduWow home"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
        lineHeight: 0,
        backgroundColor: 'transparent',
      }}
    >
      {image}
    </Box>
  );
}
