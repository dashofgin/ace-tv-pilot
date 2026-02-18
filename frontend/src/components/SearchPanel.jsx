export default function SearchPanel() {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Szukaj linkow Ace Stream</h3>
        <a
          href="https://search-ace.stream/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Otworz w nowej karcie
        </a>
      </div>
      <iframe
        src="https://search-ace.stream/"
        className="w-full border-0"
        style={{ height: '500px' }}
        title="Ace Stream Search"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
