import SectionHeading from '../../components/ui/SectionHeading';
import TipsBoard from '../../components/tips/TipsBoard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function Tips() {
  useDocumentTitle('Daily sports tips');
  return (
    <div className="relative">
      <div className="bg-grid absolute inset-x-0 top-0 -z-10 h-[28rem]" />
      <section className="container-x pt-14 pb-20">
        <SectionHeading
          eyebrow="Daily tips"
          title={<>Today's <span className="text-gradient">model picks</span></>}
          subtitle="Football, basketball, American football, volleyball and MMA. Every tip is checked against the final result, so you can see how we're doing."
        />
        <div className="mt-10"><TipsBoard /></div>
      </section>
    </div>
  );
}
