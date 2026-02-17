'use client';

import { VoteGlobe, type VoteLocation } from '@/components/vote-globe';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, MapPin, Vote, BarChart3 } from 'lucide-react';

interface GlobeViewProps {
  locations: VoteLocation[];
  totalVotes: number;
  totalActivePolls: number;
  totalCountries: number;
}

export function GlobeView({
  locations,
  totalVotes,
  totalActivePolls,
  totalCountries,
}: GlobeViewProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Globe className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Vote Globe</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          See where votes are being cast around the world
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Vote className="h-4 w-4" /> Total Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalVotes.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> Active Polls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalActivePolls.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCountries}</p>
          </CardContent>
        </Card>
      </div>

      {/* Globe */}
      <div className="flex justify-center">
        <div className="relative">
          <VoteGlobe
            locations={locations}
            width={560}
            height={560}
            className="mx-auto"
          />
          {locations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 text-center space-y-2 max-w-xs">
                <Globe className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Vote locations will appear here as people cast votes around the world.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
