export default function Toolbar({ left, right }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div className="w-full md:w-auto">{left}</div>
      <div className="flex items-center gap-3">{right}</div>
    </div>
  );
}
