import { FundraiserList } from '@/components/fundraiser/FundraiserList';

export default function MyFundraisersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Fundraisers</h1>
      <FundraiserList />
    </div>
  );
}

