import { Card, CardContent, Grid, Skeleton, Stack } from '@mui/material';

function SkeletonCard() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <Skeleton variant="rounded" width={56} height={56} sx={{ borderRadius: '18px' }} />
          <Stack sx={{ flex: 1 }}>
            <Skeleton width="40%" height={22} />
            <Skeleton width="80%" height={28} />
          </Stack>
        </Stack>
        <Skeleton width="100%" />
        <Skeleton width="70%" />
        <Skeleton width="50%" sx={{ mt: 1 }} />
      </CardContent>
    </Card>
  );
}

export default function SkeletonCards({ count = 3 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid key={`skeleton-${index}`} size={{ xs: 12, sm: 6, md: 4 }}>
          <SkeletonCard />
        </Grid>
      ))}
    </Grid>
  );
}
