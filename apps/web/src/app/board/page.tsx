'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useSavedJobs, useSaveJob } from '@/hooks/use-jobs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ExternalLink, GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const STATUSES = ['WISHLIST', 'APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED'] as const;
type Status = typeof STATUSES[number];

const STATUS_LABELS: Record<Status, string> = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  OFFERED: 'Offered',
  REJECTED: 'Rejected',
};

export default function KanbanBoardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const { data: savedJobs, isLoading } = useSavedJobs();
  const { updateStatus, unsave } = useSaveJob();

  const [columns, setColumns] = useState<Record<Status, any[]>>({
    WISHLIST: [],
    APPLIED: [],
    INTERVIEWING: [],
    OFFERED: [],
    REJECTED: [],
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Sync server state with local drag-and-drop state
  useEffect(() => {
    if (savedJobs) {
      const newColumns: Record<Status, any[]> = {
        WISHLIST: [],
        APPLIED: [],
        INTERVIEWING: [],
        OFFERED: [],
        REJECTED: [],
      };
      
      savedJobs.forEach((job: any) => {
        const status = (job.savedStatus as Status) || 'WISHLIST';
        if (newColumns[status]) newColumns[status].push(job);
      });
      
      setColumns(newColumns);
    }
  }, [savedJobs]);

  if (authLoading || !isAuthenticated) return null;

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid column
    if (!destination) return;

    // Dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceStatus = source.droppableId as Status;
    const destStatus = destination.droppableId as Status;

    // Optimistic UI update
    const sourceCol = [...columns[sourceStatus]];
    const destCol = sourceStatus === destStatus ? sourceCol : [...columns[destStatus]];
    
    const [movedJob] = sourceCol.splice(source.index, 1);
    movedJob.savedStatus = destStatus;
    
    destCol.splice(destination.index, 0, movedJob);

    setColumns(prev => ({
      ...prev,
      [sourceStatus]: sourceCol,
      [destStatus]: destCol,
    }));

    // Trigger mutation if status actually changed
    if (sourceStatus !== destStatus) {
      updateStatus.mutate({ jobId: draggableId, status: destStatus });
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between bg-muted/20">
      <Header />

      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Application Board
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Track your job hunt progress. Drag and drop a job to move it across the board.
          </p>
        </header>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-hide">
            {STATUSES.map(status => (
              <div key={status} className="flex-shrink-0 w-80 flex flex-col bg-muted/40 rounded-xl p-4 snap-start border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {STATUS_LABELS[status]}
                  </h3>
                  <Badge variant="secondary" className="rounded-full">
                    {columns[status].length}
                  </Badge>
                </div>

                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex flex-col gap-3 flex-1 min-h-[150px] transition-colors rounded-lg ${snapshot.isDraggingOver ? 'bg-muted/60' : ''}`}
                    >
                      {columns[status].map((job: any, index: number) => (
                        <Draggable key={job.id} draggableId={job.id} index={index}>
                          {(provided, snapshot) => (
                            <Card 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-4 flex flex-col gap-3 transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20 bg-background/90 backdrop-blur scale-[1.02]' : 'hover:shadow-md'}`}
                            >
                              <div className="flex items-start gap-2">
                                <div 
                                  {...provided.dragHandleProps} 
                                  className="mt-1 cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <a href={job.url || `/jobs/${job.id}`} target="_blank" rel="noreferrer" className="font-semibold leading-tight hover:underline flex items-start justify-between group">
                                    <span className="line-clamp-2">{job.title}</span>
                                    <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                                  </a>
                                  <p className="text-sm text-muted-foreground mt-1">{job.company}</p>
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground pl-6">
                                Added {formatDistanceToNow(new Date(job.savedAt || new Date()), { addSuffix: true })}
                              </div>

                              <div className="flex items-center justify-end mt-auto pt-2 border-t">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  onClick={() => unsave.mutate(job.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {columns[status].length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-6 opacity-50">
                          <span className="text-sm text-muted-foreground">Drop here</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
      
      <Footer />
    </main>
  );
}
