/**
 * Riquadro con intestazione opzionale (titolo + azioni) separata da una riga.
 * `bodyClassName` controlla il contenuto, ad esempio per togliere il padding
 * attorno a un editor.
 */
const Panel = ({ title, icon: Icon, actions, children, className = '', bodyClassName = 'p-4', as: Tag = 'section', ...rest }) => (
  <Tag className={`panel flex flex-col min-h-0 ${className}`} {...rest}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 h-11 px-4 border-b border-line shrink-0">
        {title && (
          <h2 className="flex items-center gap-2 text-[13px] font-medium text-ink truncate">
            {Icon && <Icon size={15} className="text-ink-3 shrink-0" aria-hidden="true" />}
            {title}
          </h2>
        )}
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>
    )}
    <div className={`min-h-0 ${bodyClassName}`}>{children}</div>
  </Tag>
);

export default Panel;
