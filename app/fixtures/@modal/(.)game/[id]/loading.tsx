/**
 * Static modal shell for loading state.
 * This is a SERVER component that renders pure HTML/CSS - no JS bundle needed.
 * Matches the visual appearance of the Modal component so it appears instantly.
 */
export default function ModalLoading() {
  return (
    <>
      {/* Overlay - matches Modal's overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 50,
        }}
      />

      {/* Drawer content shell - matches Modal's content container */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'white',
          padding: 20,
          zIndex: 50,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }}
      >
        {/* Skeleton content inside */}
        <div className="animate-pulse min-h-[300px]">
          {/* Match header skeleton */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="h-8 w-32 bg-gray-200 rounded" />
            <div className="h-6 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-32 bg-gray-200 rounded" />
          </div>

          {/* Date/time skeleton */}
          <div className="flex justify-center mb-6">
            <div className="h-5 w-48 bg-gray-200 rounded" />
          </div>

          {/* Details skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </>
  );
}

