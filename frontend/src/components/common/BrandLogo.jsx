import { Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import logoFull from '../../assets/eduwow-logo.png';
import logoMark from '../../assets/eduwow-mark.svg';

const SIZE_MAP = {
  compact: { height: 40, maxWidth: 40, src: logoMark, square: true },
  sidebar: { height: 88, maxWidth: 200, src: logoFull },
  auth: { height: 148, maxWidth: 280, src: logoFull },
  hero: { height: 200, maxWidth: 360, src: logoFull },
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
