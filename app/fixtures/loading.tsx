export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Fixtures</h1>
      
      {/* Skeleton for date group */}
      <div className="mb-8">
        {/* Date header skeleton */}
        <div 
          className="mb-4 rounded"
          style={{
            height: '2rem',
            width: '16rem',
            backgroundColor: '#d1d5db',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
        <div className="space-y-4">
          {/* Skeleton for fixture cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-300 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  {/* Team name skeletons */}
                  <div 
                    className="rounded"
                    style={{
                      height: '1.5rem',
                      width: '8rem',
                      backgroundColor: '#d1d5db',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                  <div 
                    className="rounded"
                    style={{
                      height: '1rem',
                      width: '2rem',
                      backgroundColor: '#d1d5db',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                  <div 
                    className="rounded"
                    style={{
                      height: '1.5rem',
                      width: '8rem',
                      backgroundColor: '#d1d5db',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                </div>
                {/* Time skeleton */}
                <div 
                  className="rounded"
                  style={{
                    height: '1rem',
                    width: '5rem',
                    backgroundColor: '#d1d5db',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                />
              </div>
              {/* Broadcast link skeleton */}
              <div 
                className="rounded"
                style={{
                  height: '1rem',
                  width: '8rem',
                  backgroundColor: '#d1d5db',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}