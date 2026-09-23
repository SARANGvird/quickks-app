import React from "react";
import PropTypes from "prop-types";
import { FaChevronLeft, FaChevronRight, FaEllipsisH } from "react-icons/fa";

/**
 * Pagination Component
 * 
 * @param {Object} props
 * @param {number} props.page - Current page index (0-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalElements - Total number of elements (optional, for display)
 * @param {Function} props.onChange - Callback when page changes
 * @param {number} props.siblingCount - Number of siblings to show on each side (default: 1)
 * @param {boolean} props.showCounts - Show total counts (default: false)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.buttonProps - Additional props for buttons
 */
const Pagination = ({ 
  page = 0, 
  totalPages = 1, 
  totalElements = 0,
  onChange, 
  siblingCount = 1,
  showCounts = false,
  className = "",
  buttonProps = {}
}) => {
  // Don't render if only one page
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (page > 0 && onChange) {
      onChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages - 1 && onChange) {
      onChange(page + 1);
    }
  };

  const handlePageClick = (pageNumber) => {
    if (onChange) {
      onChange(pageNumber);
    }
  };

  /**
   * Generate page numbers with ellipsis
   * Returns array of page numbers and ellipsis indicators
   */
  const getPageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
    const totalBlocks = totalNumbers + 2; // +2 for ellipsis blocks

    if (totalPages <= totalBlocks) {
      // Show all pages if total pages fit within display limit
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages - 2);

    const shouldShowLeftEllipsis = leftSiblingIndex > 2;
    const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 3;

    if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      // Show left part with ellipsis on right
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i);
      return [...leftRange, 'ellipsis-right', totalPages - 1];
    }

    if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
      // Show right part with ellipsis on left
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i
      );
      return [0, 'ellipsis-left', ...rightRange];
    }

    if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      // Show middle part with ellipsis on both sides
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [0, 'ellipsis-left', ...middleRange, 'ellipsis-right', totalPages - 1];
    }

    return [];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      {/* Items count display */}
      {showCounts && totalElements > 0 && (
        <div className="text-sm text-slate-400">
          Showing {page * 10 + 1} - {Math.min((page + 1) * 10, totalElements)} of {totalElements}
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Previous button */}
        <button
          onClick={handlePrevious}
          disabled={page === 0}
          className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-400 
                     hover:text-white hover:border-slate-700 hover:bg-slate-800/50 
                     disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-slate-900/50 
                     disabled:hover:text-slate-400 disabled:hover:border-slate-800
                     transition-all duration-200 focus:outline-none focus:ring-2 
                     focus:ring-blue-500/50 focus:border-blue-500"
          aria-label="Previous page"
          {...buttonProps}
        >
          <FaChevronLeft size={12} />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((item, index) => {
            if (item === 'ellipsis-left' || item === 'ellipsis-right') {
              return (
                <div
                  key={`ellipsis-${index}`}
                  className="w-10 h-10 flex items-center justify-center text-slate-500"
                  aria-hidden="true"
                >
                  <FaEllipsisH size={12} />
                </div>
              );
            }

            const pageNumber = item;
            const isActive = page === pageNumber;

            return (
              <button
                key={pageNumber}
                onClick={() => handlePageClick(pageNumber)}
                className={`min-w-[40px] h-10 rounded-xl text-xs font-black transition-all duration-200 
                           border focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                           ${isActive
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800/50"
                  }`}
                aria-label={`Page ${pageNumber + 1}`}
                aria-current={isActive ? "page" : undefined}
                {...buttonProps}
              >
                {pageNumber + 1}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={page === totalPages - 1}
          className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-400 
                     hover:text-white hover:border-slate-700 hover:bg-slate-800/50 
                     disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-slate-900/50 
                     disabled:hover:text-slate-400 disabled:hover:border-slate-800
                     transition-all duration-200 focus:outline-none focus:ring-2 
                     focus:ring-blue-500/50 focus:border-blue-500"
          aria-label="Next page"
          {...buttonProps}
        >
          <FaChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalElements: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  siblingCount: PropTypes.number,
  showCounts: PropTypes.bool,
  className: PropTypes.string,
  buttonProps: PropTypes.object
};

Pagination.defaultProps = {
  totalElements: 0,
  siblingCount: 1,
  showCounts: false,
  className: "",
  buttonProps: {}
};

export default Pagination;