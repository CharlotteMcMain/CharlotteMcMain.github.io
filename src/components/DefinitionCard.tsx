type Props = {
  id: string;
  term: string;
  topic: string;
  children: React.ReactNode;
};

export default function DefinitionCard({ id, term, topic, children }: Props) {
  return (
    <section className="definition-card" id={id} data-topic={topic}>
      <div className="definition-tag">{topic}</div>

      <div className="definition-grid">
        <div className="definition-term">{term}</div>
        <div className="definition-text">{children}</div>
      </div>
    </section>
  );
}