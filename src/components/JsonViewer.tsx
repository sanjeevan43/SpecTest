import React, { useState } from 'react';

interface JsonViewerProps {
  data: unknown;
  initExpanded?: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, initExpanded = true }) => {
  return (
    <div className="font-mono text-xs select-text overflow-x-auto bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed text-slate-300 scrollbar-thin">
      <JsonNode value={data} initExpanded={initExpanded} isLast={true} />
    </div>
  );
};

interface JsonNodeProps {
  name?: string;
  value: unknown;
  initExpanded: boolean;
  isLast: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({ name, value, initExpanded, isLast }) => {
  const [expanded, setExpanded] = useState(initExpanded);

  const renderKey = () => {
    if (!name) return null;
    return <span className="text-slate-400">"{name}": </span>;
  };

  // Null
  if (value === null) {
    return (
      <div>
        {renderKey()}
        <span className="text-slate-500 font-bold">null</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  // Undefined
  if (value === undefined) {
    return null;
  }

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div>
          {renderKey()}
          <span className="text-slate-400">[]</span>
          {!isLast && <span className="text-slate-400">,</span>}
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
          <span className="text-slate-600 mr-1 text-[10px]">{expanded ? '▼' : '▶'}</span>
          {renderKey()}
          <span className="text-slate-400">[</span>
          {!expanded && (
            <>
              <span className="text-slate-500 text-[10px] mx-1">({value.length})</span>
              <span className="text-slate-400">]</span>
              {!isLast && <span className="text-slate-400">,</span>}
            </>
          )}
        </div>

        {expanded && (
          <div className="pl-4 border-l border-slate-800/80 ml-1.5">
            {value.map((item, idx) => (
              <JsonNode
                key={idx}
                value={item}
                initExpanded={initExpanded}
                isLast={idx === value.length - 1}
              />
            ))}
          </div>
        )}

        {expanded && (
          <div>
            <span className="text-slate-400">]</span>
            {!isLast && <span className="text-slate-400">,</span>}
          </div>
        )}
      </div>
    );
  }

  // Objects
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return (
        <div>
          {renderKey()}
          <span className="text-slate-400">{"{}"}</span>
          {!isLast && <span className="text-slate-400">,</span>}
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
          <span className="text-slate-600 mr-1 text-[10px]">{expanded ? '▼' : '▶'}</span>
          {renderKey()}
          <span className="text-slate-400">{"{"}</span>
          {!expanded && (
            <>
              <span className="text-slate-500 text-[10px] mx-1">...</span>
              <span className="text-slate-400">{"}"}</span>
              {!isLast && <span className="text-slate-400">,</span>}
            </>
          )}
        </div>

        {expanded && (
          <div className="pl-4 border-l border-slate-800/80 ml-1.5">
            {keys.map((key, idx) => (
              <JsonNode
                key={key}
                name={key}
                value={(value as any)[key]}
                initExpanded={initExpanded}
                isLast={idx === keys.length - 1}
              />
            ))}
          </div>
        )}

        {expanded && (
          <div>
            <span className="text-slate-400">{"}"}</span>
            {!isLast && <span className="text-slate-400">,</span>}
          </div>
        )}
      </div>
    );
  }

  // Strings
  if (typeof value === 'string') {
    return (
      <div className="break-all whitespace-pre-wrap">
        {renderKey()}
        <span className="text-emerald-400">"{value}"</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  // Numbers
  if (typeof value === 'number') {
    return (
      <div>
        {renderKey()}
        <span className="text-amber-400">{value}</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  // Booleans
  if (typeof value === 'boolean') {
    return (
      <div>
        {renderKey()}
        <span className="text-blue-400 font-bold">{value ? 'true' : 'false'}</span>
        {!isLast && <span className="text-slate-400">,</span>}
      </div>
    );
  }

  // Fallback
  return (
    <div>
      {renderKey()}
      <span>{String(value)}</span>
      {!isLast && <span className="text-slate-400">,</span>}
    </div>
  );
};
