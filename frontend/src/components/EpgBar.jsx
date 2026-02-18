export default function EpgBar({ epgName }) {
  // EPG will be fetched from cache, for now show placeholder if epgName exists
  if (!epgName) return null;

  return (
    <div className="text-xs text-gray-400 truncate mt-1">
      {epgName}
    </div>
  );
}
