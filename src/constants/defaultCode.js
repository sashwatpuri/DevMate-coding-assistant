export const LANGUAGE_OPTIONS = [
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
  { label: "C", value: "c" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
];

export const DEFAULT_SNIPPETS = {
  python: `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

print(two_sum([2, 7, 11, 15], 9))
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    for (int i = 0; i < (int)nums.size(); ++i) {
        for (int j = i + 1; j < (int)nums.size(); ++j) {
            if (nums[i] + nums[j] == target) {
                return {i, j};
            }
        }
    }
    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    auto ans = twoSum(nums, 9);
    for (int idx : ans) cout << idx << " ";
}
`,
  java: `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[]{i, j};
                }
            }
        }
        return new int[]{};
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        System.out.println(Arrays.toString(twoSum(nums, 9)));
    }
}
`,
  javascript: `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}
console.log(twoSum([2, 7, 11, 15], 9));
`,
  typescript: `function twoSum(nums: number[], target: number): number[] {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}
console.log(twoSum([2, 7, 11, 15], 9));
`,
  c: `#include <stdio.h>

void twoSum(int* nums, int numsSize, int target, int* result) {
    for (int i = 0; i < numsSize; ++i) {
        for (int j = i + 1; j < numsSize; ++j) {
            if (nums[i] + nums[j] == target) {
                result[0] = i;
                result[1] = j;
                return;
            }
        }
    }
}

int main() {
    int nums[] = {2, 7, 11, 15};
    int result[2] = {0};
    twoSum(nums, 4, 9, result);
    printf("%d %d\\n", result[0], result[1]);
    return 0;
}
`,
  go: `package main
import "fmt"

func twoSum(nums []int, target int) []int {
    for i := 0; i < len(nums); i++ {
        for j := i + 1; j < len(nums); j++ {
            if nums[i]+nums[j] == target {
                return []int{i, j}
            }
        }
    }
    return []int{}
}

func main() {
    nums := []int{2, 7, 11, 15}
    fmt.Println(twoSum(nums, 9))
}
`,
  rust: `fn two_sum(nums: &[i32], target: i32) -> Vec<usize> {
    for i in 0..nums.len() {
        for j in (i + 1)..nums.len() {
            if nums[i] + nums[j] == target {
                return vec![i, j];
            }
        }
    }
    vec![]
}

fn main() {
    let nums = vec![2, 7, 11, 15];
    let ans = two_sum(&nums, 9);
    println!("{:?}", ans);
}
`,
};

