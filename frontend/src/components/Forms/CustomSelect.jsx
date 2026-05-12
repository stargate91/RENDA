import React, { useState, useRef, useEffect } from 'react';
  import { ChevronDown, Search } from 'lucide-react';

const CustomSelect = ({ value, options, onChange, placeholder = 'Select...', searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = searchable 
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`custom-select-container ${isOpen ? 'is-open' : ''}`} ref={ref}>
      <div 
        className="custom-select-header" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="selected-label">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`select-arrow ${isOpen ? 'rotate' : ''}`} size={16} />
      </div>
      
      {isOpen && (
        <div className="custom-select-dropdown">
          {searchable && (
            <div className="select-search-wrapper">
              <Search size={14} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
          <div className="dropdown-scroll">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value} 
                  className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="no-results">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
