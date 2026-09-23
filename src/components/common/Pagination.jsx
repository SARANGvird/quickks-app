// src/components/common/Pagination.jsx
import React from 'react';
import { FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';

const Pagination = ({ 
  page, 
  totalPages, 
  totalElements, 
  size, 
  onPageChange, 
  onSizeChange,
  rowsPerPageOptions = [10, 25, 50, 100]
}) => {
  const startItem = page * size + 1;
  const endItem = Math.min((page + 1) * size, totalElements);
  
  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      onPageChange(newPage);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(0, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(0, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            page === i
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {i + 1}
        </button>
      );
    }
    
    return pages;
  };

  if (totalPages === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-[#0f172a] rounded-xl border border-slate-800">
      <div className="text-sm text-slate-400">
        Showing {startItem} to {endItem} of {totalElements} entries
      </div>
      
      <div className="flex items-center gap-2">
        <select
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
        >
          {rowsPerPageOptions.map(option => (
            <option key={option} value={option}>{option} per page</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => handlePageChange(0)}
          disabled={page === 0}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="First Page"
        >
          <FaAngleDoubleLeft size={14} />
        </button>
        
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 0}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Previous Page"
        >
          <FaChevronLeft size={14} />
        </button>
        
        <div className="flex gap-1">
          {renderPageNumbers()}
        </div>
        
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages - 1}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Next Page"
        >
          <FaChevronRight size={14} />
        </button>
        
        <button
          onClick={() => handlePageChange(totalPages - 1)}
          disabled={page === totalPages - 1}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Last Page"
        >
          <FaAngleDoubleRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;