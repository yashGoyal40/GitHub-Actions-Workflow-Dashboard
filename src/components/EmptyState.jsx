export default function EmptyState({ title, description, action }) {
  return (
    <div className="text-center p-8 glass rounded-2xl max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-100 mb-2">{title}</h2>
      {description && <p className="text-gray-400 mb-6">{description}</p>}
      {action}
    </div>
  );
}
