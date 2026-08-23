import { TableContainer } from '@mui/material';

/**
 * Horizontal-scroll wrapper for wide data tables on phones/tablets.
 */
export default function ResponsiveTableContainer({
  children,
  sx = {},
  ...props
}) {
  return (
    <TableContainer
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableContainer>
  );
}
