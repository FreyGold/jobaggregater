'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAlertSubscriptions, useSubscribeAlert, useUnsubscribeAlert, useTestAlert } from '@/hooks/use-alerts';
import { Trash2, Mail, Plus, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlertsPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  
  const { data: alerts = [], isLoading } = useAlertSubscriptions();
  const subscribeMutation = useSubscribeAlert();
  const unsubscribeMutation = useUnsubscribeAlert();
  const testMutation = useTestAlert();

  const [email, setEmail] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [authLoading, isAuthenticated, router, user]);

  if (authLoading || !isAuthenticated) return null;

  const addKeyword = (kw: string) => {
    if (kw.trim() && !keywords.includes(kw.trim())) {
      setKeywords(prev => [...prev, kw.trim()]);
    }
    setKeywordInput('');
  };

  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword(keywordInput);
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleSubscribe = () => {
    let finalKeywords = [...keywords];
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      finalKeywords.push(keywordInput.trim());
    }
    if (!email || finalKeywords.length === 0) return;
    
    subscribeMutation.mutate({ email, keywords: finalKeywords, frequency }, {
      onSuccess: () => {
        setKeywords([]);
        setKeywordInput('');
      }
    });
  };

  const handleUnsubscribe = (id: string) => {
    setRemovingIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      unsubscribeMutation.mutate(id, {
        onSettled: () => {
          setRemovingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      });
    }, 400);
  };

  return (
    <main className="min-h-screen flex flex-col justify-between">
      <Header />

      <PageShell className="max-w-4xl">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Job Alerts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Get daily or weekly emails with the latest jobs matching your search criteria.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/alerts/history')}>
            View Alert History
          </Button>
        </header>

        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Active Subscriptions</h2>
            
            {isLoading ? (
              <Card className="p-6 space-y-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-16 w-full" />
              </Card>
            ) : alerts.length === 0 && removingIds.size === 0 ? (
              <Card className="p-8 text-center text-muted-foreground bg-muted/30">
                <Mail className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No active email alerts.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => {
                  const isRemoving = removingIds.has(alert.id);
                  return (
                    <Card key={alert.id} className={cn("p-5 transition-all duration-300", isRemoving && "opacity-0 scale-95")}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={alert.isActive ? "default" : "secondary"}>
                              {alert.frequency === 'daily' ? 'Daily' : 'Weekly'}
                            </Badge>
                            <span className="text-sm font-medium">{alert.email}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alert.keywords.map(kw => (
                              <Badge key={kw} variant="outline" className="bg-background">{kw}</Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            Created on {new Date(alert.createdAt).toLocaleDateString()}
                            {alert.lastSentAt && ` • Last sent: ${new Date(alert.lastSentAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => testMutation.mutate(alert.id)}
                            disabled={testMutation.isPending}
                            title="Send Test Email"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => handleUnsubscribe(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Card className="p-5 sticky top-24">
              <h3 className="text-base font-semibold mb-4">Create New Alert</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Delivery Email</label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Keywords</label>
                  <div className="flex gap-2">
                    <Input 
                      value={keywordInput} 
                      onChange={e => setKeywordInput(e.target.value)}
                      onKeyDown={handleAddKeyword}
                      placeholder="e.g. React, Remote (Press Enter)"
                      className="flex-1"
                    />
                    <Button 
                      variant="secondary" 
                      onClick={() => addKeyword(keywordInput)}
                      disabled={!keywordInput.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {keywords.map(kw => (
                        <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                          {kw}
                          <button onClick={() => handleRemoveKeyword(kw)} className="hover:bg-muted-foreground/20 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Frequency</label>
                  <div className="flex gap-2">
                    <Button 
                      variant={frequency === 'daily' ? 'default' : 'outline'} 
                      className="flex-1"
                      onClick={() => setFrequency('daily')}
                    >
                      Daily
                    </Button>
                    <Button 
                      variant={frequency === 'weekly' ? 'default' : 'outline'} 
                      className="flex-1"
                      onClick={() => setFrequency('weekly')}
                    >
                      Weekly
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full mt-2" 
                  onClick={handleSubscribe}
                  disabled={!email || (keywords.length === 0 && !keywordInput.trim()) || subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending ? 'Creating...' : 'Create Alert'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </PageShell>

      <Footer />
    </main>
  );
}
