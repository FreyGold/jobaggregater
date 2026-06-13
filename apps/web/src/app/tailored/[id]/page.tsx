'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { latex as latexLang } from 'codemirror-lang-latex';
import { useAuth } from '@/providers/auth-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTailoredResume, useUpdateTailored, useGenerateCv } from '@/hooks/use-resumes';
import { Save, Download, ArrowLeft, Loader2 } from 'lucide-react';

export default function CVEditorPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: cv, isLoading, isError } = useTailoredResume(id);
  const updateMutation = useUpdateTailored();
  const compileMutation = useGenerateCv();

  const [latex, setLatex] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasCompiled, setHasCompiled] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cv && !hasCompiled) {
      setLatex(cv.tailoredContent);
      setHasCompiled(true);
      compileMutation.mutate(cv.tailoredContent, {
        onSuccess: (blob) => {
          if (pdfUrl) URL.revokeObjectURL(pdfUrl);
          setPdfUrl(URL.createObjectURL(blob));
          setCompileError(null);
        },
        onError: (e) => {
          setCompileError(e instanceof Error ? e.message : 'Compilation failed');
        },
      });
    }
  }, [cv, hasCompiled]);

  const compile = useCallback(async (value: string) => {
    setCompileError(null);
    try {
      const blob = await compileMutation.mutateAsync(value);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
      setCompileError(null);
    } catch (e) {
      setCompileError(e instanceof Error ? e.message : 'Compilation failed');
    }
  }, [compileMutation, pdfUrl]);

  const onChange = useCallback((value: string) => {
    setLatex(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (saved) setSaved(false);
    debounceRef.current = setTimeout(() => compile(value), 800);
  }, [compile, saved]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ id, tailoredContent: latex });
      setSaved(true);
    } catch (e) {
      console.error('Save error:', e);
      setCompileError('Save failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleDownload = async () => {
    setCompileError(null);
    try {
      const blob = await compileMutation.mutateAsync(latex);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cv?.jobTitle ?? 'cv'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setCompileError(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const isCompiling = compileMutation.isPending;
  const isSaving = updateMutation.isPending;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) return null;
  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="flex gap-4 h-[80vh]">
            <Skeleton className="flex-1" />
            <Skeleton className="flex-1" />
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (isError || !cv) {
    return (
      <main className="min-h-screen flex flex-col">
        <Header />
        <PageShell>
          <p className="text-muted-foreground">CV not found.</p>
          <Button variant="outline" onClick={() => router.push('/tailored')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </PageShell>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />

      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/tailored')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <span className="font-semibold text-sm">{cv.jobTitle}</span>
            <span className="text-muted-foreground text-sm ml-2">at {cv.companyName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCompiling && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Compiling...
            </span>
          )}
          {saved && <span className="text-xs text-green-500">Saved</span>}
          {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={isCompiling}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-1" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="w-1/2 overflow-hidden border-r">
          <CodeMirror
            value={latex}
            height="100%"
            theme={vscodeDark}
            extensions={[latexLang()]}
            onChange={onChange}
            style={{ height: '100%' }}
          />
        </div>
        <div className="w-1/2 relative bg-muted/30">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="PDF Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground gap-2 px-8">
              {isCompiling ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Compiling...
                </span>
              ) : compileError ? (
                <div className="w-full max-w-lg">
                  <p className="text-red-500 font-medium mb-1">Compilation failed:</p>
                  <pre className="text-xs text-red-400 whitespace-pre-wrap bg-red-950/10 p-3 rounded-lg max-h-48 overflow-y-auto">{compileError}</pre>
                </div>
              ) : (
                <span>Edit the LaTeX to see a live PDF preview</span>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
