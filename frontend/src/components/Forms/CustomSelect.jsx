import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ value, options, onChange, placeholder = 'Select...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
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
          <div className="dropdown-scroll">
            {options.map(opt => (
              <div 
                key={opt.value} 
                className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
