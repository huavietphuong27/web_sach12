import React from 'react';

/** Khung xương nhấp nháy (shimmer) mô phỏng vị trí bìa, tiêu đề và nút của thẻ sách. */
export const BookCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
    <div className="aspect-[2/3] w-full bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-3 w-1/2 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="h-4 w-3/4 rounded bg-slate-200" />
      <div className="h-3 w-1/3 rounded bg-slate-100" />
      <div className="h-12 w-full rounded-lg bg-indigo-50/70" />
      <div className="h-9 w-full rounded-lg bg-slate-200" />
    </div>
  </div>
);
