import type { ItemId } from '../domain/state';
export function ItemArt({ id }: { id: ItemId }) {
  const artwork = {
    bed: <><path d="M5 27h38v16H5z" fill="#ac776b" /><path d="M8 26h32v11H8z" fill="#dca69b" /><path d="M12 21h24v13H12z" fill="#efcfb4" /><path d="M5 27h5v16H5zm33 0h5v16h-5z" fill="#916153" /></>,
    rug: <><path d="M5 18h38v24H5z" fill="#ead8a6" /><path d="M9 22h30v16H9z" fill="#be7464" /><path d="M20 22h8v16h-8zM9 28h30v4H9z" fill="#e1b286" /><path d="M2 22h3v3H2zm0 9h3v3H2zm41-9h3v3h-3zm0 9h3v3h-3z" fill="#c4a171" /></>,
    plant: <><path d="M21 11h6v21h-6z" fill="#526a4a" /><path d="M8 9h13v10H8zm19-5h13v12H27zM7 21h14v8H7zm20-3h14v9H27z" fill="#819a60" /><path d="M13 30h22v5H13zm3 5h16v10H16z" fill="#b88262" /><path d="M16 35h5v10h-5z" fill="#d5a177" /></>,
    bowl: <><path d="M5 29h38v9H5zm5 9h28v6H10z" fill="#7f9b9a" /><path d="M8 26h32v6H8z" fill="#d0ddcb" /><path d="M12 27h24v3H12z" fill="#916c4d" /><path d="M11 35h8v5h-8z" fill="#adc7bf" /></>,
    lamp: <><path d="M22 14h4v29h-4zM15 43h18v4H15z" fill="#72614d" /><path d="M15 8h18v21H15z" fill="#7b7555" /><path d="M18 12h12v13H18z" fill="#f2d78e" /><path d="M12 7h24v5H12zM20 3h8v4h-8z" fill="#5d674d" /></>,
    picture: <><path d="M8 8h32v30H8z" fill="#89674a" /><path d="M12 12h24v22H12z" fill="#eee1ba" /><path d="M20 24h9v6h-9zM17 18h4v5h-4zm6-3h4v6h-4zm7 3h4v5h-4z" fill="#9a7850" /></>,
  };
  return <svg viewBox="0 0 48 48" fill="none" shapeRendering="crispEdges" aria-hidden="true">{artwork[id]}</svg>;
}
