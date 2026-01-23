import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function MyDeals() {
  const { user, logout } = useAuth();
  const { data: deals, isLoading: dealsLoading } = trpc.deals.list.useQuery();
  const { data: commissions, isLoading: commissionsLoading } = trpc.commissions.myCommissions.useQuery();

  const totalCommission = commissions?.reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0) || 0;
  const paidCommission = commissions?.filter(c => c.paid).reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0) || 0;
  const pendingCommission = totalCommission - paidCommission;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-black">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="text-2xl font-bold text-black hover:underline">FRIDAY CRM</a>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/corporations">
                <a className="text-black hover:underline">Konzerne</a>
              </Link>
              <Link href="/deals">
                <a className="text-black hover:underline">Pipeline</a>
              </Link>
              <Link href="/my-deals">
                <a className="text-black font-bold border-b-2 border-black pb-1">My Deals</a>
              </Link>
              <div className="flex items-center gap-4 ml-6 pl-6 border-l border-gray-300">
                <span className="text-sm text-gray-600">{user?.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="border-black text-black hover:bg-gray-100"
                >
                  Logout
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black mb-2">My Deals & Commissions</h2>
          <p className="text-gray-600">Ihre persönlichen Deals und Provisionen</p>
        </div>

        {/* Commission Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Total Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">€{totalCommission.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">€{paidCommission.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">€{pendingCommission.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Deals Table */}
        <Card className="border-2 border-gray-300 mb-12">
          <CardHeader>
            <CardTitle className="text-black">My Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {dealsLoading ? (
              <div className="text-center py-12 text-gray-600">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-300">
                    <TableHead className="font-bold text-black">Deal Name</TableHead>
                    <TableHead className="font-bold text-black">Value</TableHead>
                    <TableHead className="font-bold text-black">Stage</TableHead>
                    <TableHead className="font-bold text-black">Probability</TableHead>
                    <TableHead className="font-bold text-black">Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals && deals.length > 0 ? (
                    deals.map((deal) => (
                      <TableRow key={deal.id} className="border-b border-gray-300">
                        <TableCell className="font-medium text-black">{deal.dealName}</TableCell>
                        <TableCell className="text-gray-600">
                          {deal.dealValueEur ? `€${Number(deal.dealValueEur).toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs border border-gray-300 bg-white text-black">
                            {deal.stage}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600">{deal.probability}%</TableCell>
                        <TableCell className="text-gray-600">{deal.subscriptionTier || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-600">
                        Keine Deals vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Commissions Table */}
        <Card className="border-2 border-gray-300">
          <CardHeader>
            <CardTitle className="text-black">Commission Details</CardTitle>
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <div className="text-center py-12 text-gray-600">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gray-300">
                    <TableHead className="font-bold text-black">Deal ID</TableHead>
                    <TableHead className="font-bold text-black">Commission %</TableHead>
                    <TableHead className="font-bold text-black">Amount</TableHead>
                    <TableHead className="font-bold text-black">Status</TableHead>
                    <TableHead className="font-bold text-black">Paid Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions && commissions.length > 0 ? (
                    commissions.map((commission) => (
                      <TableRow key={commission.id} className="border-b border-gray-300">
                        <TableCell className="text-gray-600 font-mono text-xs">
                          {commission.dealId.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {commission.commissionPercent}%
                        </TableCell>
                        <TableCell className="font-medium text-black">
                          €{Number(commission.commissionAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs border ${
                            commission.paid 
                              ? 'border-black bg-black text-white' 
                              : 'border-gray-300 bg-white text-black'
                          }`}>
                            {commission.paid ? 'Paid' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {commission.paidDate 
                            ? new Date(commission.paidDate).toLocaleDateString('de-DE')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-600">
                        Keine Provisionen vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

