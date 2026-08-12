import { Box } from '@mui/material';

export default function PageContainer({ children, sx, ...props }) {
  return (
    <Box className="eq-page eq-fade-in" sx={sx} {...props}>
      {children}
    </Box>
  );
}
