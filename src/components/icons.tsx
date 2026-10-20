type P = { className?: string };
const S = ({ className = "h-5 w-5", children }: P & { children: React.ReactNode }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const IconCart = (p: P) => <S {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6" /></S>;
export const IconUser = (p: P) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></S>;
export const IconSearch = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></S>;
export const IconMenu = (p: P) => <S {...p}><path d="M3 6h18M3 12h18M3 18h18" /></S>;
export const IconX = (p: P) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>;
export const IconHeart = (p: P) => <S {...p}><path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9Z" /></S>;
export const IconStar = (p: P) => <S {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" /></S>;
export const IconTruck = (p: P) => <S {...p}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></S>;
export const IconChat = (p: P) => <S {...p}><path d="M4 5h16v11H8l-4 4Z" /></S>;
export const IconPlus = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IconCrown = (p: P) => <S {...p}><path d="m3 8 4 4 5-6 5 6 4-4-2 11H5Z" /></S>;
export const IconCheck = (p: P) => <S {...p}><path d="m5 12 5 5 9-10" /></S>;
export const IconUpload = (p: P) => <S {...p}><path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" /></S>;
export const IconWhatsapp = (p: P) => <S {...p}><path d="M4 20l1.3-4A8 8 0 1 1 8 18.8Z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2Z" /></S>;
