import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, XCircle, Users, Building, Settings, Receipt, DollarSign } from 'lucide-react';

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    drafts_pending: 0,
    waiting_approval: 0,
    approved: 0,
    rejections: 0
  });
  const [taxStats, setTaxStats] = useState({
    total_assessed: 0,
    total_collected: 0,
    collection_rate: 0,
    total_outstanding: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchTaxStats();
  }, []);

  // Real-time subscription for customer, property, and tax changes
  useEffect(() => {
    const customersChannel = supabase
      .channel('dashboard-customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload) => {
          console.log('Customer change detected on dashboard:', payload);
          fetchStats();
        }
      )
      .subscribe();

    const propertiesChannel = supabase
      .channel('dashboard-properties-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties'
        },
        (payload) => {
          console.log('Property change detected on dashboard:', payload);
          fetchStats();
        }
      )
      .subscribe();

    const taxAssessmentsChannel = supabase
      .channel('dashboard-tax-assessments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tax_assessments'
        },
        (payload) => {
          console.log('Tax assessment change detected on dashboard:', payload);
          fetchTaxStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(propertiesChannel);
      supabase.removeChannel(taxAssessmentsChannel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-dashboard-stats');
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats from edge function, falling back to direct query:', error);
      
      // Fallback: Query database directly
      try {
        const [draftsRes, submittedRes, approvedRes, rejectedRes] = await Promise.all([
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'DRAFT'),
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED'),
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'REJECTED'),
        ]);

        setStats({
          drafts_pending: draftsRes.count || 0,
          waiting_approval: submittedRes.count || 0,
          approved: approvedRes.count || 0,
          rejections: rejectedRes.count || 0,
        });
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxStats = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase.functions.invoke('get-tax-stats', {
        body: { tax_year: currentYear.toString() }
      });
      if (error) throw error;
      setTaxStats(data);
    } catch (error) {
      console.error('Error fetching tax stats from edge function, falling back to direct query:', error);

      try {
        const currentYear = new Date().getFullYear();
        const { data, error: fallbackError } = await supabase
          .from('tax_assessments')
          .select('assessed_amount, paid_amount, outstanding_amount, tax_year')
          .eq('tax_year', currentYear);

        if (fallbackError) throw fallbackError;

        const totals = (data || []).reduce(
          (acc, row: any) => {
            const assessed = Number(row.assessed_amount) || 0;
            const paid = Number(row.paid_amount) || 0;
            const outstanding = Number(row.outstanding_amount) || 0;
            acc.total_assessed += assessed;
            acc.total_collected += paid;
            acc.total_outstanding += outstanding;
            return acc;
          },
          { total_assessed: 0, total_collected: 0, total_outstanding: 0 }
        );

        const collection_rate =
          totals.total_assessed > 0
            ? (totals.total_collected / totals.total_assessed) * 100
            : 0;

        setTaxStats({
          total_assessed: totals.total_assessed,
          total_collected: totals.total_collected,
          total_outstanding: totals.total_outstanding,
          collection_rate,
        });
      } catch (directError) {
        console.error('Fallback tax stats query failed:', directError);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statsCards = [
    {
      title: 'Drafts Pending Submission',
      value: stats.drafts_pending.toString(),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      onClick: () => navigate('/customers?status=DRAFT')
    },
    {
      title: 'Waiting Approval',
      value: stats.waiting_approval.toString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      onClick: () => profile?.role === 'APPROVER' || profile?.role === 'ADMINISTRATOR' 
        ? navigate('/review-queue') 
        : navigate('/customers?status=SUBMITTED')
    },
    {
      title: 'Approved & Published',
      value: stats.approved.toString(),
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      onClick: () => navigate('/customers?status=APPROVED')
    },
    {
      title: 'Rejections Needing Fixes',
      value: stats.rejections.toString(),
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      onClick: () => navigate('/customers?status=REJECTED')
    },
  ];

  const getQuickActions = () => {
    switch (profile?.role) {
      case 'INPUTTER':
        return [
          { label: 'New Customer', icon: Users, action: () => navigate('/customers/new') },
          { label: 'New Property', icon: Building, action: () => navigate('/properties/new') },
          { label: 'New Tax Assessment', icon: Receipt, action: () => navigate('/tax/new') },
        ];
      case 'APPROVER':
        return [
          { label: 'Review Queue', icon: CheckCircle, action: () => navigate('/review-queue') },
          { label: 'Tax Assessments', icon: Receipt, action: () => navigate('/tax') },
        ];
      case 'ADMINISTRATOR':
        return [
          { label: 'Manage Users', icon: Users, action: () => navigate('/admin/users') },
          { label: 'Manage Lookups', icon: Settings, action: () => navigate('/admin/lookups') },
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome, {profile?.full_name}</h1>
        <p className="text-muted-foreground mt-1">
          Role: <span className="font-medium text-foreground">{profile?.role}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card 
            key={stat.title} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`rounded-full p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tax Collection Stats - Admin Only */}
      {profile?.role === 'ADMINISTRATOR' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tax Collection This Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Assessed</p>
                <p className="text-2xl font-bold">{formatCurrency(taxStats.total_assessed)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(taxStats.total_collected)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold">{taxStats.collection_rate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(taxStats.total_outstanding)}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/tax')}
            >
              View All Tax Assessments
            </Button>
          </CardContent>
        </Card>
      )}

      {quickActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="gap-2"
                onClick={action.action}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default Dashboard;
