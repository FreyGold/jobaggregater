import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px',
          background:
            'radial-gradient(circle at 20% 20%, #e9d5ff 0%, #ddd6fe 25%, #f5f3ff 55%, #ffffff 100%)',
          color: '#0f172a',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, color: '#7c3aed' }}>JobAgg</div>
        <div style={{ marginTop: 20, fontSize: 68, fontWeight: 800, lineHeight: 1.1, display: 'flex', flexDirection: 'column' }}>
          Every job.
          <br />
          One search.
        </div>
        <div style={{ marginTop: 20, fontSize: 30, color: '#334155' }}>
          Aggregated listings from 30+ sources
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
