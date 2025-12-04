import { CreateFundraiserForm } from '@/components/fundraiser/CreateFundraiserForm';

export default function CreateFundraiserPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Fundraiser</h1>
      <CreateFundraiserForm />
    </div>
  );
}

