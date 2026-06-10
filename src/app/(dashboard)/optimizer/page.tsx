
"use client"

import { useState } from "react"
import { optimizeAchievementBullets, OptimizeAchievementBulletsOutput } from "@/ai/flows/optimize-achievement-bullets"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Loader2, Sparkles, Copy, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function OptimizerPage() {
  const [inputBullets, setInputBullets] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OptimizeAchievementBulletsOutput | null>(null)

  const handleOptimize = async () => {
    const bulletsArray = inputBullets.split('\n').filter(b => b.trim() !== "")
    
    if (bulletsArray.length === 0) {
      toast({
        title: "Input required",
        description: "Please enter at least one bullet point.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const output = await optimizeAchievementBullets({
        bulletPoints: bulletsArray
      })
      setResult(output)
    } catch (error) {
      toast({
        title: "Optimization failed",
        description: "Could not refine your bullet points at this time.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Optimized bullet point copied to clipboard."
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-headline font-bold">Bullet Optimizer</h1>
        <p className="text-muted-foreground text-lg">Contextually transform passive bullets into high-impact achievement statements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-headline tracking-widest uppercase">Passive Input</CardTitle>
            <CardDescription>Enter your existing resume bullet points (one per line).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="e.g., Managed a team of 5 software engineers...&#10;Responsible for cloud migration..." 
              className="min-h-[300px] bg-background/50 border-white/10 font-mono text-sm leading-relaxed"
              value={inputBullets}
              onChange={(e) => setInputBullets(e.target.value)}
            />
            <Button 
              onClick={handleOptimize} 
              className="w-full h-12 text-md font-headline"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reasoning Results...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Optimize Achievements
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {result ? (
            <Card className="glass-card border-primary/20 animate-in zoom-in-95 duration-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-headline tracking-widest uppercase">High-Impact Statements</CardTitle>
                  <CardDescription>AI-generated results-driven refinements.</CardDescription>
                </div>
                <Sparkles className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent className="space-y-4">
                {result.optimizedBulletPoints.map((bullet, idx) => (
                  <div key={idx} className="group relative p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                    <p className="text-sm leading-relaxed pr-8">{bullet}</p>
                    <button 
                      onClick={() => copyToClipboard(bullet)}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setResult(null);
                    setInputBullets("");
                  }}
                  className="w-full mt-4 border-white/10 hover:bg-white/5"
                >
                  <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Start Over
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-50">
              <Zap className="h-16 w-16 text-muted-foreground mb-6" strokeWidth={0.5} />
              <h3 className="text-xl font-headline font-medium mb-2">Ready to Optimize</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Input your passive responsibilities on the left and see them transform into quantified achievements.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
