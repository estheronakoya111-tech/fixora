export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-1 px-5 py-5 text-center text-xs text-subtle sm:flex-row sm:justify-center sm:gap-2 sm:text-left md:px-8">
      <span>Fixora helps explain your options; you decide what to send.</span>
      <span aria-hidden className="hidden sm:inline">·</span>
      <span>© 2026 Fixora. All rights reserved.</span>
    </footer>
  );
}
