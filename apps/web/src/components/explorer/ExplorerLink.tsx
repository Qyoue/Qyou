export function ExplorerLink({ hash }: { hash: string }) {
  return <a href={`https://stellar.expert/explorer/public/tx/${hash}`}>{hash}</a>;
}
